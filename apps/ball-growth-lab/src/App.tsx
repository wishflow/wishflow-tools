import { useCallback, useEffect, useRef, useState } from 'react';
import { createSeed } from './random';
import { PopulationChart } from './components/PopulationChart';
import { SetupPanel } from './components/SetupPanel';
import { SimulationCanvas, type CanvasHandle } from './rendering/SimulationCanvas';
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
  exits: 0,
  missedBirths: 0,
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
  const [simulationError, setSimulationError] = useState('');
  const [canvasError, setCanvasError] = useState('');
  const canvasRef = useRef<CanvasHandle>(null);
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

  const handleRendererFps = useCallback((fps: number) => setRenderFps(fps), []);
  const handleCanvasError = useCallback((message: string) => setCanvasError(message), []);

  const start = () => {
    activeRunId.current += 1;
    setSimulationError('');
    setCanvasError('');
    setStats({ ...EMPTY_STATS, currentCount: config.initialCount });
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
          <span>碰撞驱动的弹性世界</span>
        </div>
        <span className="local-chip"><span />离线实验舱</span>
      </header>

      <section className="intro-row">
        <div className="intro-copy-block">
          <p className="intro-kicker"><span />物理游乐场 · 第 01 号实验</p>
          <h1>让碰撞，<span>创造更多碰撞。</span></h1>
          <p className="intro-copy">调好初速度、重力与繁殖规则，发射一群弹性小球。</p>
        </div>
        <div className={`status-stamp status-stamp-${runState}`}>
          <span className={`status-dot status-${runState}`} />
          <span aria-live="polite">{statusText}</span>
          {runState !== 'setup' && <strong>{formatTime(stats.elapsedSeconds)}</strong>}
        </div>
      </section>

      <div className="lab-grid">
        <SetupPanel
          config={config}
          runState={runState}
          seedNotice={seedNotice}
          onChange={(next) => setConfig(next)}
          onStart={start}
          onReset={reset}
          onNewSeed={() => {
            setConfig((current) => ({ ...current, seed: createSeed() }));
            setSeedNotice('新种子已生成。');
          }}
          onCopySeed={copySeed}
        />

        <section className="stage-panel panel" aria-labelledby="stage-title">
          <header className="stage-header">
            <div className="stage-heading">
              <span className="orbit-mark" aria-hidden="true"><i /><i /><i /></span>
              <div>
                <p className="overline">LIVE ARENA</p>
                <h2 id="stage-title">弹性运动场</h2>
              </div>
            </div>
            <div className="stage-actions">
              <span className="fps-pill"><i />{renderFps || '—'} <small>FPS</small></span>
              {(runState === 'running' || runState === 'paused') && (
                <button type="button" className="stage-action-button" onClick={pauseOrResume} aria-label={runState === 'running' ? '暂停实验' : '继续实验'}>
                  {runState === 'running' ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" /></svg>
                  ) : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z" /></svg>}
                  {runState === 'running' ? '暂停' : '继续'}
                </button>
              )}
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
                <span>调好实验条件，点击「开始实验」</span>
              </div>
            )}
            {runState === 'paused' && <div className="paused-ribbon">实验暂停</div>}
            {runState === 'ended' && (
              <div className="game-over" role="status" aria-live="polite">
                <span className="game-over-orbit" aria-hidden="true">✦</span>
                <p>POPULATION GOAL</p>
                <h3>球群已满员！</h3>
                <span>{stats.currentCount} 颗球 · 实验完成</span>
                <button type="button" onClick={reset}>调整规则，再玩一次</button>
              </div>
            )}
            {canvasError && <div className="canvas-error" role="alert">{canvasError}</div>}
          </div>

          <footer className="stage-footer">
            <span><b>{config.shape === 'square' ? '正方形' : '圆形'}</b> · 边长 {config.arenaSize} m · {config.gapCount} 个缺口</span>
            <span className="seed-chip">种子 <b>{config.seed || '未设置'}</b></span>
          </footer>
        </section>

        <aside className="results-panel panel" aria-labelledby="results-title">
          <header className="panel-heading results-heading">
            <div>
              <span className="section-glyph glyph-lime" aria-hidden="true">B</span>
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
            <div className="metric-cell metric-born"><span>出生</span><strong>{stats.births}</strong></div>
            <div className="metric-cell metric-exited"><span>离场</span><strong>{stats.exits}</strong></div>
            <div className="metric-cell metric-blocked"><span>未出生</span><strong>{stats.missedBirths}</strong></div>
            <div className="metric-cell metric-fps"><span>物理步进</span><strong>{physicsFps || '—'}<small> Hz</small></strong></div>
            <div className="metric-cell metric-speed"><span>场内最高速度</span><strong>{runState === 'setup' ? '—' : stats.maxSpeed.toFixed(1)}<small> m/s</small></strong></div>
          </div>

          <PopulationChart samples={samples} active={runState !== 'setup'} />

          <p className="result-note">
            <span className="note-spark" aria-hidden="true">✳</span>
            未出生表示通过概率判定，但附近没有空位，或现有动能不足以生成球。
          </p>
          {simulationError && <p className="error-note" role="alert">{simulationError} 重置实验后可重试。</p>}
        </aside>
      </div>

      <footer className="page-footer">
        <span>弹性碰撞 · 无阻尼 · 新生时重新分配动量与能量</span>
        <span>本地运行 · 实验数据不会上传</span>
      </footer>
      </main>
    </>
  );
}
