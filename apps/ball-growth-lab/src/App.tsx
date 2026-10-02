import { useCallback, useEffect, useRef, useState } from 'react';
import { createSeed } from './random';
import { PopulationChart } from './components/PopulationChart';
import { SetupPanel } from './components/SetupPanel';
import { SimulationCanvas, type CanvasHandle } from './rendering/SimulationCanvas';
import { createReplayExport } from './replay';
import {
  DEFAULT_CONFIG,
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

interface WorkerErrorMessage {
  type: 'error';
  runId: number;
  message: string;
}

type SimulationWorkerMessage = WorkerSnapshotMessage | WorkerErrorMessage;

const EMPTY_STATS: SimulationStats = {
  elapsedSeconds: 0,
  currentCount: 0,
  births: 0,
  birthAttempts: 0,
  exits: 0,
  missedBirths: 0,
  missedSpaceBirths: 0,
  missedEnergyBirths: 0,
  maxSpeed: 0,
};

function formatTime(seconds: number): string {
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60).toString().padStart(2, '0')}:${(wholeSeconds % 60).toString().padStart(2, '0')}`;
}

function makeSparkline(samples: PopulationSample[]): string {
  if (samples.length < 2) return '';
  const recent = samples.slice(-32);
  const maximum = Math.max(...recent.map((sample) => sample.count), 1);
  return recent.map((sample, index) => {
    const x = (index / (recent.length - 1)) * 96;
    const y = 23 - (sample.count / maximum) * 19;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [runState, setRunState] = useState<RunState>('setup');
  const [stats, setStats] = useState(EMPTY_STATS);
  const [physicsFps, setPhysicsFps] = useState(0);
  const [renderFps, setRenderFps] = useState(0);
  const [samples, setSamples] = useState<PopulationSample[]>([]);
  const [seedNotice, setSeedNotice] = useState('');
  const [exportNotice, setExportNotice] = useState('');
  const [simulationError, setSimulationError] = useState('');
  const [canvasError, setCanvasError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);
  const settingsDialogRef = useRef<HTMLElement>(null);
  const settingsCloseRef = useRef<HTMLButtonElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const latestStatsRef = useRef(EMPTY_STATS);
  const workerRef = useRef<Worker | null>(null);
  const lastStatsUpdate = useRef(0);
  const lastSampleTime = useRef(0);
  const activeRunId = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('./physics/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SimulationWorkerMessage>) => {
      const message = event.data;
      if (message.runId !== activeRunId.current) return;
      if (message.type === 'error') {
        setSimulationError(message.message);
        setRunState('paused');
        return;
      }

      const packed = new Float32Array(message.ballData);
      const balls = Array.from({ length: message.ballCount }, (_, index) => {
        const offset = index * 6;
        return {
          id: packed[offset],
          x: packed[offset + 1],
          y: packed[offset + 2],
          radius: packed[offset + 3],
          color: packed[offset + 4],
          shape: packed[offset + 5] === 0 ? 'circle' as const : 'outline' as const,
        };
      });
      canvasRef.current?.updateBalls(balls);

      const now = performance.now();
      latestStatsRef.current = message.stats;
      if (now - lastStatsUpdate.current >= 250 || message.sequence === 0) {
        setStats(message.stats);
        setPhysicsFps(message.stats.physicsFps);
        lastStatsUpdate.current = now;
      }
      if (message.ended) {
        setStats(message.stats);
        setPhysicsFps(message.stats.physicsFps);
        setRunState('ended');
      }
      if (message.sequence === 0 || message.time - lastSampleTime.current >= 0.5) {
        setSamples((previous) => [...previous, { time: message.time, count: message.stats.currentCount }].slice(-120));
        lastSampleTime.current = message.time;
      }
    };
    worker.onerror = (event) => {
      setSimulationError(event.message || '物理工作线程发生错误。');
      setRunState('paused');
    };

    return () => {
      worker.postMessage({ type: 'stop' } satisfies WorkerCommand);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    settingsCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = settingsDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const insideDialog = settingsDialogRef.current?.contains(document.activeElement) ?? false;
      if (event.shiftKey && (document.activeElement === first || !insideDialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !insideDialog)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      settingsButtonRef.current?.focus();
    };
  }, [settingsOpen]);

  const handleRendererFps = useCallback((fps: number) => setRenderFps(fps), []);
  const handleCanvasError = useCallback((message: string) => setCanvasError(message), []);

  const start = () => {
    activeRunId.current += 1;
    setSimulationError('');
    setCanvasError('');
    const initialStats = { ...EMPTY_STATS, currentCount: config.initialCount };
    latestStatsRef.current = initialStats;
    setStats(initialStats);
    setPhysicsFps(0);
    setRenderFps(0);
    setSamples([]);
    lastStatsUpdate.current = 0;
    lastSampleTime.current = -1;
    workerRef.current?.postMessage({ type: 'start', config, runId: activeRunId.current } satisfies WorkerCommand);
    setRunState('running');
  };

  const pauseOrResume = () => {
    if (runState === 'running') {
      workerRef.current?.postMessage({ type: 'pause' } satisfies WorkerCommand);
      setRunState('paused');
    } else if (runState === 'paused') {
      workerRef.current?.postMessage({ type: 'resume' } satisfies WorkerCommand);
      setRunState('running');
    }
  };

  const reset = () => {
    activeRunId.current += 1;
    workerRef.current?.postMessage({ type: 'stop' } satisfies WorkerCommand);
    canvasRef.current?.updateBalls([]);
    setRunState('setup');
    latestStatsRef.current = EMPTY_STATS;
    setStats(EMPTY_STATS);
    setPhysicsFps(0);
    setRenderFps(0);
    setSamples([]);
    setSimulationError('');
    setCanvasError('');
    lastSampleTime.current = 0;
  };

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(config.seed);
      setSeedNotice('已复制，可在另一组实验中粘贴复现。');
    } catch {
      setSeedNotice('浏览器未开放剪贴板权限，请手动复制种子。');
    }
  };

  const createReplayConfig = () => createReplayExport({
    config,
    runState,
    stats: latestStatsRef.current,
    rendererFps: renderFps,
    environment: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
    },
  });

  const downloadReplayConfig = () => {
    const json = JSON.stringify(createReplayConfig(), null, 2);
    const blobUrl = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `ball-growth-${config.seed || 'replay'}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    setExportNotice('复现配置 JSON 已下载。');
  };

  const copyReplayConfig = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(createReplayConfig(), null, 2));
      setExportNotice('完整复现配置 JSON 已复制。');
    } catch {
      setExportNotice('复制失败；请使用「下载复现配置」保存 JSON 文件。');
    }
  };

  const statusText = runState === 'running'
    ? '正在运行'
    : runState === 'paused'
      ? '已暂停'
      : runState === 'ended'
        ? '人口目标达成'
        : '等待发射';
  const sparkline = makeSparkline(samples);

  return (
    <>
      <a className="skip-link" href="#main-content">跳到实验台内容</a>
      <main id="main-content" className="app-shell">
        <header className="topbar">
          <a className="brand-mark" href="../" aria-label="回到工具导航">
            <svg viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="17" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="83 24" strokeLinecap="round" transform="rotate(-48 22 22)" />
              <circle cx="17" cy="16" r="4" fill="#f07860" />
              <circle cx="27" cy="25" r="5" fill="#5ab68f" />
              <circle cx="17" cy="29" r="3" fill="#e9bd38" />
            </svg>
          </a>
          <div className="brand-copy">
            <p>球群生长实验室</p>
            <span>碰撞 · 弯曲轨迹 · 繁殖</span>
          </div>
          <div className={`status-stamp status-stamp-${runState}`}>
            <span className={`status-dot status-${runState}`} />
            <span aria-live="polite">{statusText}</span>
            {runState !== 'setup' && <strong>{formatTime(stats.elapsedSeconds)}</strong>}
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="toolbar-button toolbar-primary"
              onClick={runState === 'setup' || runState === 'ended' ? start : pauseOrResume}
              aria-label={runState === 'setup' || runState === 'ended' ? '开始实验' : runState === 'running' ? '暂停实验' : '继续实验'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {runState === 'running' ? <path d="M8 5v14M16 5v14" /> : <path d="m8 5 11 7-11 7z" />}
              </svg>
              <span>{runState === 'running' ? '暂停' : runState === 'paused' ? '继续' : '开始'}</span>
            </button>
            <button
              type="button"
              className="toolbar-button toolbar-icon"
              onClick={reset}
              aria-label="重置实验"
              title="重置实验"
              disabled={runState === 'setup'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
            <button
              ref={settingsButtonRef}
              type="button"
              className="toolbar-button toolbar-icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="打开实验设置"
              aria-haspopup="dialog"
              aria-expanded={settingsOpen}
              title="实验设置"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" /></svg>
            </button>
          </div>
        </header>

        <div className="lab-grid">
          <section className="stage-panel panel" aria-labelledby="stage-title">
            <header className="stage-header">
              <div className="stage-heading">
                <span className="orbit-mark" aria-hidden="true"><i /><i /><i /></span>
                <div>
                  <p className="overline">LIVE ARENA</p>
                  <h1 id="stage-title">弹性运动场</h1>
                </div>
              </div>
              <div className="stage-actions">
                <span className="field-chip">{config.motionField === 'curvature' ? `弯曲场 ${config.curvatureRate.toFixed(1)} rad/s` : `重力 ${config.gravity.toFixed(1)} m/s²`}</span>
                <span className="fps-pill"><i />{renderFps || '—'} <small>FPS</small></span>
              </div>
            </header>

            <div className={`arena-shell ${runState === 'paused' ? 'arena-paused' : ''}`}>
              <SimulationCanvas
                ref={canvasRef}
                shape={config.shape}
                gapCount={config.gapCount}
                arenaSize={config.arenaSize}
                ballDiameterRatio={config.ballDiameterRatio}
                gapWidthRatio={config.gapWidthRatio}
                onFps={handleRendererFps}
                onError={handleCanvasError}
              />
              {runState === 'setup' && (
                <div className="arena-prompt">
                  <span className="prompt-orbit" aria-hidden="true"><i /><i /></span>
                  <strong>场地已准备好</strong>
                  <span>点击「开始」发射球群</span>
                </div>
              )}
              {runState === 'paused' && <div className="paused-ribbon">实验暂停</div>}
              {runState === 'ended' && (
                <div className="game-over" role="status" aria-live="polite">
                  <span className="game-over-orbit" aria-hidden="true">✦</span>
                  <p>POPULATION GOAL</p>
                  <h2>球群已满员！</h2>
                  <span>{stats.currentCount} 颗球 · 实验完成</span>
                  <button type="button" onClick={start}>沿用条件再试一次</button>
                </div>
              )}
              {canvasError && <div className="canvas-error" role="alert">{canvasError}</div>}
            </div>

            <footer className="stage-footer">
              <span><b>{config.shape === 'square' ? '正方形' : '圆形'}</b> · {config.arenaSize} m · {config.gapCount} 个缺口</span>
              <span className="seed-chip">种子 <b>{config.seed || '未设置'}</b></span>
            </footer>
          </section>

          <aside className="results-panel panel" aria-labelledby="results-title">
            <header className="panel-heading results-heading">
              <div>
                <span className="section-glyph glyph-lime" aria-hidden="true">↗</span>
                <div>
                  <p className="overline">实时记录</p>
                  <h2 id="results-title">实验结果</h2>
                </div>
              </div>
              <span className={`mini-state mini-state-${runState}`}>{statusText}</span>
            </header>

            <div className="population-total">
              <span>场内球数</span>
              <div><strong>{runState === 'setup' ? '—' : stats.currentCount}</strong><span>个</span></div>
              <svg className="population-sparkline" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
                {sparkline && <polyline points={sparkline} />}
              </svg>
            </div>

            <div className="metric-grid">
              <div className="metric-cell metric-born"><span>成功出生</span><strong>{stats.births}</strong></div>
              <div className="metric-cell metric-exited"><span>离场</span><strong>{stats.exits}</strong></div>
              <div className="metric-cell metric-blocked"><span>空间不足</span><strong>{stats.missedSpaceBirths}</strong></div>
              <div className="metric-cell metric-energy"><span>能量不足</span><strong>{stats.missedEnergyBirths}</strong></div>
              <div className="metric-cell metric-fps"><span>物理步进</span><strong>{physicsFps || '—'}<small> Hz</small></strong></div>
              <div className="metric-cell metric-speed"><span>最高速度</span><strong>{runState === 'setup' ? '—' : stats.maxSpeed.toFixed(1)}<small> m/s</small></strong></div>
            </div>

            <PopulationChart samples={samples} active={runState !== 'setup'} />

            <p className="result-note">
              <span className="note-spark" aria-hidden="true">✳</span>
              碰撞候选 {stats.birthAttempts} 次 · 未出生共 {stats.missedBirths} 次。可据此区分局部拥挤和能量不足。
            </p>
            {simulationError && <p className="error-note" role="alert">{simulationError} 重置实验后可重试。</p>}
          </aside>
        </div>

        {settingsOpen && (
          <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
            <section ref={settingsDialogRef} className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title">
              <header className="settings-dialog-header">
                <div>
                  <p className="overline">CONTROL ROOM</p>
                  <h2 id="settings-dialog-title">实验设置</h2>
                </div>
                <button ref={settingsCloseRef} type="button" className="toolbar-button toolbar-icon" onClick={() => setSettingsOpen(false)} aria-label="关闭实验设置">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </header>
              <SetupPanel
                config={config}
                runState={runState}
                seedNotice={seedNotice}
                exportNotice={exportNotice}
                onChange={(next) => setConfig(next)}
                onNewSeed={() => {
                  setConfig((current) => ({ ...current, seed: createSeed() }));
                  setSeedNotice('新种子已生成。');
                }}
                onCopySeed={copySeed}
                onExportConfig={downloadReplayConfig}
                onCopyConfig={copyReplayConfig}
              />
            </section>
          </div>
        )}
      </main>
    </>
  );
}
