import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createSeed } from './random';
import { PopulationChart } from './components/PopulationChart';
import { SetupPanel, type SetupTab } from './components/SetupPanel';
import type { CanvasHandle } from './rendering/SimulationCanvas';
import { createReplayExport } from './replay';
import {
  DEFAULT_CONFIG,
  type EndReason,
  type RunState,
  type SimulationConfig,
  type SimulationStats,
  type WorkerCommand,
  type WorkerSnapshotMessage,
} from './types';

interface PopulationSample {
  time: number;
  count: number;
}

interface RunRecord {
  config: SimulationConfig;
  stats: SimulationStats;
  runState: RunState;
  endReason: EndReason | null;
  rendererFps: number;
  samples: PopulationSample[];
}

interface WorkerErrorMessage {
  type: 'error';
  runId: number;
  message: string;
}

type SimulationWorkerMessage = WorkerSnapshotMessage | WorkerErrorMessage;

const SimulationCanvas = lazy(async () => {
  const module = await import('./rendering/SimulationCanvas');
  return { default: module.SimulationCanvas };
});

const EMPTY_STATS: SimulationStats = {
  elapsedSeconds: 0,
  currentCount: 0,
  births: 0,
  birthAttempts: 0,
  exits: 0,
  missedBirths: 0,
  missedSpaceBirths: 0,
  missedEnergyBirths: 0,
  birthKineticEnergyAdded: 0,
  birthMomentumAdded: { x: 0, y: 0 },
  maxSpeed: 0,
};

function formatTime(seconds: number): string {
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60).toString().padStart(2, '0')}:${(wholeSeconds % 60).toString().padStart(2, '0')}`;
}

function reasonCopy(reason: EndReason | null): { title: string; detail: string } {
  switch (reason) {
    case 'population-target': return { title: '达到人口目标', detail: '球群已达到你设定的数量。' };
    case 'single-ball': return { title: '只剩 1 颗球', detail: '没有第二颗球，无法继续繁殖。' };
    case 'no-balls': return { title: '场内没有球', detail: '所有球都已离开场地。' };
    case 'manual': return { title: '实验已结束', detail: '本轮数据已保留，可以查看或导出。' };
    default: return { title: '实验结束', detail: '本轮数据已保留。' };
  }
}

function makeRunRecord(
  config: SimulationConfig,
  stats: SimulationStats,
  runState: RunState,
  endReason: EndReason | null,
  rendererFps: number,
  samples: PopulationSample[],
): RunRecord {
  return { config: { ...config }, stats: { ...stats }, runState, endReason, rendererFps, samples: [...samples] };
}

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [setupTab, setSetupTab] = useState<SetupTab>('arena');
  const [runState, setRunState] = useState<RunState>('setup');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [physicsFps, setPhysicsFps] = useState(0);
  const [renderFps, setRenderFps] = useState(0);
  const [samples, setSamples] = useState<PopulationSample[]>([]);
  const [lastRun, setLastRun] = useState<RunRecord | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [endDialogResume, setEndDialogResume] = useState(false);
  const [seedNotice, setSeedNotice] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const [simulationError, setSimulationError] = useState('');
  const [canvasError, setCanvasError] = useState('');
  const canvasRef = useRef<CanvasHandle>(null);
  const endCancelRef = useRef<HTMLButtonElement>(null);
  const finishTriggerRef = useRef<HTMLButtonElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const latestStatsRef = useRef(EMPTY_STATS);
  const latestSamplesRef = useRef<PopulationSample[]>([]);
  const activeRunConfigRef = useRef<SimulationConfig>(DEFAULT_CONFIG);
  const renderFpsRef = useRef(0);
  const lastStatsUpdate = useRef(0);
  const lastSampleTime = useRef(0);
  const activeRunId = useRef(0);

  const transition = useCallback((next: RunState) => setRunState(next), []);

  const handleWorkerMessage = useCallback((message: SimulationWorkerMessage) => {
    if (message.runId !== activeRunId.current) return;
    if (message.type === 'error') {
      setSimulationError(message.message);
      setEndDialogOpen(false);
      transition('failed');
      workerRef.current?.terminate();
      workerRef.current = null;
      return;
    }

    canvasRef.current?.updateBalls(new Float32Array(message.ballData), message.ballCount);
    const now = performance.now();
    latestStatsRef.current = message.stats;
    if (now - lastStatsUpdate.current >= 250 || message.sequence === 0 || message.ended) {
      setStats(message.stats);
      setPhysicsFps(message.stats.physicsFps);
      lastStatsUpdate.current = now;
    }

    if (message.sequence === 0 || message.time - lastSampleTime.current >= 0.5 || message.ended) {
      const nextSample = { time: message.time, count: message.stats.currentCount };
      const nextSamples = [...latestSamplesRef.current, nextSample].slice(-120);
      latestSamplesRef.current = nextSamples;
      setSamples(nextSamples);
      lastSampleTime.current = message.time;
    }

    if (message.ended) {
      setStats(message.stats);
      setPhysicsFps(message.stats.physicsFps);
      setEndDialogOpen(false);
      transition('ended');
      setLastRun(makeRunRecord(
        activeRunConfigRef.current,
        message.stats,
        'ended',
        message.endReason,
        renderFpsRef.current,
        latestSamplesRef.current,
      ));
    } else {
      setRunState((current) => current === 'starting' ? 'running' : current);
    }
  }, [transition]);

  const getOrCreateWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL('./physics/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<SimulationWorkerMessage>) => handleWorkerMessage(event.data);
    worker.onerror = (event) => {
      setSimulationError(event.message || '物理工作线程发生错误。');
      setEndDialogOpen(false);
      transition('failed');
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
    workerRef.current = worker;
    return worker;
  }, [handleWorkerMessage, transition]);

  useEffect(() => () => {
    const worker = workerRef.current;
    if (!worker) return;
    worker.postMessage({ type: 'stop' } satisfies WorkerCommand);
    worker.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => {
    if (!endDialogOpen) return;
    endCancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelFinish();
        return;
      }
      if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('.confirm-dialog');
        const focusable = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [endDialogOpen]);

  const handleRendererFps = useCallback((fps: number) => {
    renderFpsRef.current = fps;
    setRenderFps(fps);
  }, []);
  const handleCanvasError = useCallback((message: string) => setCanvasError(message), []);

  const startRun = (runConfig: SimulationConfig) => {
    let worker: Worker;
    try {
      worker = getOrCreateWorker();
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : '无法创建物理工作线程。');
      transition('failed');
      return;
    }
    activeRunId.current += 1;
    activeRunConfigRef.current = { ...runConfig };
    setSimulationError('');
    setCanvasError('');
    setEndDialogOpen(false);
    const initialStats = { ...EMPTY_STATS, currentCount: runConfig.initialCount };
    latestStatsRef.current = initialStats;
    setStats(initialStats);
    setPhysicsFps(0);
    setRenderFps(0);
    renderFpsRef.current = 0;
    const initialSamples = [{ time: 0, count: runConfig.initialCount }];
    latestSamplesRef.current = initialSamples;
    setSamples(initialSamples);
    lastStatsUpdate.current = 0;
    lastSampleTime.current = -1;
    canvasRef.current?.updateBalls(new Float32Array(), 0);
    transition('starting');
    try {
      worker.postMessage({ type: 'start', config: runConfig, runId: activeRunId.current } satisfies WorkerCommand);
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : '无法启动物理工作线程。');
      worker.terminate();
      workerRef.current = null;
      transition('failed');
    }
  };

  const pause = () => {
    workerRef.current?.postMessage({ type: 'pause' } satisfies WorkerCommand);
    transition('paused');
  };

  const resume = () => {
    workerRef.current?.postMessage({ type: 'resume' } satisfies WorkerCommand);
    transition('running');
  };

  const requestFinish = () => {
    if (runState !== 'running' && runState !== 'paused') return;
    const wasRunning = runState === 'running';
    setEndDialogResume(wasRunning);
    if (wasRunning) {
      workerRef.current?.postMessage({ type: 'pause' } satisfies WorkerCommand);
      transition('paused');
    }
    setEndDialogOpen(true);
  };

  const cancelFinish = () => {
    setEndDialogOpen(false);
    finishTriggerRef.current?.focus();
    if (!endDialogResume) return;
    workerRef.current?.postMessage({ type: 'resume' } satisfies WorkerCommand);
    transition('running');
  };

  const confirmFinish = () => {
    setEndDialogOpen(false);
    transition('ending');
    workerRef.current?.postMessage({ type: 'finish' } satisfies WorkerCommand);
  };

  const returnToSetup = () => {
    workerRef.current?.postMessage({ type: 'stop' } satisfies WorkerCommand);
    canvasRef.current?.updateBalls(new Float32Array(), 0);
    setEndDialogOpen(false);
    setSimulationError('');
    setCanvasError('');
    transition('setup');
  };

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(config.seed);
      setSeedNotice('种子已复制。');
    } catch {
      setSeedNotice('无法访问剪贴板，请手动复制种子。');
    }
  };

  const makeExport = (record: RunRecord | null, state: RunState) => createReplayExport({
    config: record?.config ?? (state === 'setup' ? config : activeRunConfigRef.current),
    runState: record?.runState ?? state,
    endReason: record?.endReason ?? null,
    stats: record?.stats ?? (state === 'setup' ? EMPTY_STATS : latestStatsRef.current),
    rendererFps: record?.rendererFps ?? renderFpsRef.current,
    environment: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
    },
  });

  const downloadExport = (record: RunRecord | null, state: RunState, label: string) => {
    const json = JSON.stringify(makeExport(record, state), null, 2);
    const blobUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `ball-growth-${(record?.config ?? config).seed || 'replay'}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    setExportNotice(label);
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(makeExport(null, 'setup'), null, 2));
      setExportNotice('当前设置 JSON 已复制。');
    } catch {
      setExportNotice('复制失败，请使用下载按钮保存 JSON。');
    }
  };

  const activeConfig = activeRunConfigRef.current;

  if (runState === 'setup') {
    return (
      <SetupPanel
        config={config}
        activeTab={setupTab}
        lastRun={lastRun ? { stats: lastRun.stats, endReason: lastRun.endReason } : null}
        seedNotice={seedNotice}
        exportNotice={exportNotice}
        onTabChange={setSetupTab}
        onChange={setConfig}
        onNewSeed={() => {
          setConfig((current) => ({ ...current, seed: createSeed() }));
          setSeedNotice('新种子已生成。');
        }}
        onCopySeed={copySeed}
        onExportConfig={() => downloadExport(null, 'setup', '当前设置已下载。')}
        onCopyConfig={copyExport}
        onExportLastRun={() => downloadExport(lastRun, 'ended', '上次实验记录已下载。')}
        onStart={() => startRun(config)}
      />
    );
  }

  const statusLabel: Record<RunState, string> = {
    setup: '设置',
    starting: '准备中',
    running: '运行中',
    paused: '已暂停',
    ending: '正在结束',
    ended: '已结束',
    failed: '模拟出错',
  };
  const reason = reasonCopy(lastRun?.endReason ?? null);

  return (
    <main className={`play-screen play-screen-${runState}`}>
      <header className="play-topbar">
        <a className="brand-link" href="../" aria-label="回到工具首页">
          <span className="brand-orbit" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>球群生长</strong><small>碰撞 · 繁殖 · 观察</small></span>
        </a>
        <div className="run-status" aria-live="polite">
          <i className={`run-status-dot dot-${runState}`} />
          <span>{statusLabel[runState]}</span>
          <strong>{formatTime(stats.elapsedSeconds)}</strong>
        </div>
        <div className="play-actions">
          {runState !== 'ended' && <button className="button button-icon" type="button" onClick={() => downloadExport(null, runState, '本轮复现参数已下载。')} aria-label="导出本轮复现参数" title="导出本轮复现参数">⇩</button>}
          {runState === 'running' && <button className="button button-secondary" type="button" onClick={pause}>暂停</button>}
          {runState === 'paused' && <button className="button button-primary" type="button" onClick={resume}>继续</button>}
          {(runState === 'running' || runState === 'paused') && <button ref={finishTriggerRef} className="button button-danger" type="button" onClick={requestFinish}>结束实验</button>}
          {runState === 'starting' && <button className="button button-primary" type="button" disabled>准备中…</button>}
          {runState === 'ending' && <button className="button button-primary" type="button" disabled>正在结束…</button>}
          {runState === 'ended' && <button className="button button-icon" type="button" onClick={() => downloadExport(lastRun, 'ended', '复现记录已下载。')} aria-label="下载本轮复现记录" title="下载本轮复现记录">⇩</button>}
        </div>
      </header>

      <section className="play-layout" aria-label="球群模拟与实时记录">
        <section className={`arena-stage ${runState === 'paused' ? 'arena-is-paused' : ''}`} aria-label="模拟场地">
          <Suspense fallback={<div className="simulation-canvas canvas-loading" role="status">正在创建场地…</div>}>
            <SimulationCanvas ref={canvasRef} config={activeConfig} onFps={handleRendererFps} onError={handleCanvasError} />
          </Suspense>
          <div className="arena-info" aria-live="polite">
            <span className="arena-info-label">场内球数</span>
            <strong>{stats.currentCount}</strong>
          </div>
          <div className="arena-seed">种子 <strong>{activeConfig.seed}</strong></div>
          {runState === 'paused' && <div className="paused-overlay"><strong>已暂停</strong><span>继续后从当前位置接着运行</span></div>}
          {runState === 'starting' && <div className="state-overlay"><strong>正在创建实验…</strong></div>}
          {runState === 'ending' && <div className="state-overlay"><strong>正在保存本轮结果…</strong></div>}
          {runState === 'ended' && (
            <div className="game-over" role="status" aria-live="polite">
              <span className="end-orbit" aria-hidden="true">✦</span>
              <p>{reason.title}</p>
              <h1>{stats.currentCount} <small>颗球</small></h1>
              <span>{reason.detail}</span>
              <div className="end-actions">
                <button className="button button-primary" type="button" onClick={() => startRun(activeConfig)}>同条件重跑</button>
                <button className="button button-secondary" type="button" onClick={returnToSetup}>修改设置</button>
              </div>
            </div>
          )}
          {runState === 'failed' && (
            <div className="game-over game-error" role="alert">
              <span className="end-orbit" aria-hidden="true">!</span>
              <p>模拟中断</p>
              <h1>这一轮没有完成</h1>
              <span>{simulationError || '物理工作线程发生错误。'}</span>
              <div className="end-actions">
                <button className="button button-primary" type="button" onClick={() => startRun(activeConfig)}>重试这组参数</button>
                <button className="button button-secondary" type="button" onClick={returnToSetup}>返回设置</button>
              </div>
            </div>
          )}
          {canvasError && <div className="canvas-error" role="alert">{canvasError}</div>}
        </section>

        <aside className="live-panel" aria-label="实验数据">
          <div className="live-heading"><span>本轮记录</span><strong>{renderFps || '—'} <small>FPS</small></strong></div>
          <div className="live-metrics">
            <div><span>新生</span><strong>{stats.births}</strong></div>
            <div><span>离场</span><strong>{stats.exits}</strong></div>
            <div><span>未能出生</span><strong>{stats.missedBirths}</strong></div>
            <div><span>最高速度</span><strong>{stats.maxSpeed.toFixed(1)}<small> m/s</small></strong></div>
          </div>
          <PopulationChart samples={samples} active={runState !== 'starting'} />
          <p className="physics-caption">重力 {activeConfig.gravity.toFixed(1)} m/s² · 弹性 {activeConfig.restitution.toFixed(2)}</p>
          {simulationError && <p className="error-note" role="alert">{simulationError}</p>}
          {lastRun && runState !== 'failed' && (
            <p className="last-run-note">上轮：{reasonCopy(lastRun.endReason).title} · {lastRun.stats.currentCount} 颗球</p>
          )}
        </aside>
      </section>

      {endDialogOpen && (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelFinish(); }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="finish-title" aria-describedby="finish-detail">
            <span className="dialog-symbol" aria-hidden="true">Ⅱ</span>
            <h2 id="finish-title">结束这轮实验？</h2>
            <p id="finish-detail">当前模拟会停止，已有统计和参数会保留，之后仍可导出或同条件重跑。</p>
            <div className="dialog-actions">
              <button ref={endCancelRef} className="button button-secondary" type="button" onClick={cancelFinish}>{endDialogResume ? '继续实验' : '返回暂停'}</button>
              <button className="button button-danger" type="button" onClick={confirmFinish}>结束并保留结果</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
