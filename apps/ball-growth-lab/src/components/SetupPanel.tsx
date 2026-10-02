import type { ArenaShape, MotionField, RunState, SimulationConfig } from '../types';
import { MAX_ARENA_SIZE, MIN_ARENA_SIZE } from '../types';

interface SetupPanelProps {
  config: SimulationConfig;
  runState: RunState;
  seedNotice: string;
  exportNotice: string;
  onChange: (config: SimulationConfig) => void;
  onNewSeed: () => void;
  onCopySeed: () => void;
  onExportConfig: () => void;
  onCopyConfig: () => void;
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span className="control-heading">
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <input
        type="range"
        name={label}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        aria-label={label}
      />
    </label>
  );
}

function ShapeChoice({
  value,
  disabled,
  onChange,
}: {
  value: ArenaShape;
  disabled: boolean;
  onChange: (value: ArenaShape) => void;
}) {
  return (
    <div className="shape-control">
      <span className="control-heading"><span>边界形状</span></span>
      <div className="segmented-control" role="group" aria-label="边界形状">
        <button type="button" aria-pressed={value === 'square'} disabled={disabled} onClick={() => onChange('square')}>
          <span className="shape-icon shape-icon-square" aria-hidden="true" />正方形
        </button>
        <button type="button" aria-pressed={value === 'circle'} disabled={disabled} onClick={() => onChange('circle')}>
          <span className="shape-icon shape-icon-circle" aria-hidden="true" />圆形
        </button>
      </div>
    </div>
  );
}

function MotionChoice({
  value,
  disabled,
  onChange,
}: {
  value: MotionField;
  disabled: boolean;
  onChange: (value: MotionField) => void;
}) {
  return (
    <div className="shape-control">
      <span className="control-heading"><span>运动场</span></span>
      <div className="segmented-control" role="group" aria-label="运动场类型">
        <button type="button" aria-pressed={value === 'curvature'} disabled={disabled} onClick={() => onChange('curvature')}>
          <span className="field-icon field-icon-curve" aria-hidden="true">↻</span>弯曲轨迹
        </button>
        <button type="button" aria-pressed={value === 'gravity'} disabled={disabled} onClick={() => onChange('gravity')}>
          <span className="field-icon field-icon-gravity" aria-hidden="true">↓</span>重力
        </button>
      </div>
    </div>
  );
}

function Icon({ name }: { name: 'copy' | 'shuffle' | 'play' | 'reset' }) {
  const paths = {
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    shuffle: <><path d="m16 3 4 4-4 4" /><path d="M4 7h2c5 0 7 10 12 10h2" /><path d="m16 13 4 4-4 4" /><path d="M4 17h2c1.7 0 3-1.2 4.1-2.8M14 9.8C15.1 8.2 16.4 7 18 7h2" /></>,
    play: <path d="m8 5 11 7-11 7z" />,
    reset: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function SetupPanel({ config, runState, seedNotice, exportNotice, onChange, onNewSeed, onCopySeed, onExportConfig, onCopyConfig }: SetupPanelProps) {
  const locked = runState !== 'setup';
  const change = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => onChange({ ...config, [key]: value });
  const directionNames = ['右', '右下', '下', '左下', '左', '左上', '上', '右上'];
  const directionName = directionNames[Math.round(config.initialDirection / 45) % directionNames.length];

  return (
    <section className="setup-panel panel" aria-labelledby="setup-title">
      <header className="panel-heading">
        <div>
          <span className="section-glyph" aria-hidden="true">A</span>
          <div>
            <p className="overline">控制台 01</p>
            <h2 id="setup-title">实验设置</h2>
          </div>
        </div>
        {locked && <span className="lock-chip">已锁定</span>}
      </header>

      <div className="seed-control">
        <label htmlFor="seed-input">随机种子</label>
        <div className="seed-input-row">
          <input
            id="seed-input"
            name="seed"
            autoComplete="off"
            inputMode="text"
            type="text"
            value={config.seed}
            maxLength={20}
            disabled={locked}
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(event) => change('seed', event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
          />
          <button type="button" className="icon-button" disabled={locked} aria-label="生成新种子" title="生成新种子" onClick={onNewSeed}>
            <Icon name="shuffle" />
          </button>
          <button type="button" className="icon-button" aria-label="复制随机种子" title="复制随机种子" onClick={onCopySeed}>
            <Icon name="copy" />
          </button>
        </div>
        <p className="seed-hint" aria-live="polite">{seedNotice || '重置会复用这个种子，方便比较结果。'}</p>
        <div className="export-actions">
          <button type="button" className="export-button" onClick={onExportConfig} aria-label="下载复现配置 JSON">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 16v4h14v-4" /></svg>
            下载复现配置
          </button>
          <button type="button" className="export-copy-button" onClick={onCopyConfig} aria-label="复制复现配置 JSON">复制 JSON</button>
        </div>
        <p className="export-hint" aria-live="polite">{exportNotice || '包含种子、完整参数和当前运行诊断。'}</p>
      </div>

      <div className="setting-group">
        <p className="group-title"><span>01</span> 场地结构</p>
        <ShapeChoice value={config.shape} disabled={locked} onChange={(value) => change('shape', value)} />
        <RangeControl
          label="场地边长"
          value={config.arenaSize}
          min={MIN_ARENA_SIZE}
          max={MAX_ARENA_SIZE}
          step={2}
          display={`${config.arenaSize} m`}
          disabled={locked}
          onChange={(value) => change('arenaSize', value)}
        />
        <RangeControl
          label="均匀分布的缺口"
          value={config.gapCount}
          min={0}
          max={8}
          step={1}
          display={`${config.gapCount} 个`}
          disabled={locked}
          onChange={(value) => change('gapCount', value)}
        />
        <RangeControl
          label="缺口宽度 / 球径"
          value={config.gapWidthRatio}
          min={1.05}
          max={3}
          step={0.05}
          display={`${config.gapWidthRatio.toFixed(2)}×`}
          disabled={locked || config.gapCount === 0}
          onChange={(value) => change('gapWidthRatio', value)}
        />
        <RangeControl
          label="球的直径 / 场地宽度"
          value={config.ballDiameterRatio}
          min={0.012}
          max={0.036}
          step={0.002}
          display={`${(config.ballDiameterRatio * 100).toFixed(1)}%`}
          disabled={locked}
          onChange={(value) => change('ballDiameterRatio', value)}
        />
      </div>

      <div className="setting-group">
        <p className="group-title"><span>02</span> 球群发射</p>
        <RangeControl
          label="初始球数"
          value={config.initialCount}
          min={2}
          max={Math.max(2, Math.min(100, config.maxPopulation - 1))}
          step={1}
          display={`${config.initialCount} 个`}
          disabled={locked}
          onChange={(value) => change('initialCount', value)}
        />
        <RangeControl
          label="人口目标 · 达到即结束"
          value={config.maxPopulation}
          min={3}
          max={1000}
          step={1}
          display={`${config.maxPopulation} 个`}
          disabled={locked}
          onChange={(value) => onChange({
            ...config,
            maxPopulation: value,
            initialCount: Math.min(config.initialCount, value - 1),
          })}
        />
        <RangeControl
          label="初速度强度"
          value={config.initialSpeed}
          min={0}
          max={24}
          step={0.5}
          display={`${config.initialSpeed.toFixed(1)} m/s`}
          disabled={locked}
          onChange={(value) => change('initialSpeed', value)}
        />
        <RangeControl
          label="球间速度波动"
          value={config.speedSpread}
          min={0}
          max={1}
          step={0.05}
          display={`±${Math.round(config.speedSpread * 100)}%`}
          disabled={locked}
          onChange={(value) => change('speedSpread', value)}
        />
        <RangeControl
          label="初始方向"
          value={config.initialDirection}
          min={0}
          max={360}
          step={15}
          display={`${directionName} · ${config.initialDirection}°`}
          disabled={locked}
          onChange={(value) => change('initialDirection', value)}
        />
        <RangeControl
          label="方向随机扩散"
          value={config.directionSpread}
          min={0}
          max={180}
          step={5}
          display={`±${config.directionSpread}°`}
          disabled={locked}
          onChange={(value) => change('directionSpread', value)}
        />
        <p className="direction-hint">0° 向右 · 90° 向下 · 180° 向左 · 270° 向上</p>
      </div>

      <div className="setting-group">
        <p className="group-title"><span>03</span> 运动与繁殖</p>
        <MotionChoice value={config.motionField} disabled={locked} onChange={(value) => change('motionField', value)} />
        {config.motionField === 'curvature' ? (
          <>
            <RangeControl
              label="轨迹弯曲方向与速率"
              value={config.curvatureRate}
              min={-2.5}
              max={2.5}
              step={0.1}
              display={config.curvatureRate === 0 ? '直线' : `${config.curvatureRate > 0 ? '顺时针' : '逆时针'} ${Math.abs(config.curvatureRate).toFixed(1)} rad/s`}
              disabled={locked}
              onChange={(value) => change('curvatureRate', value)}
            />
            <p className="physics-hint">垂直于速度的转向场只改变方向，不改变自由飞行速度；不设重力，不会把球压向“底部”。</p>
          </>
        ) : (
          <>
        <RangeControl
          label="向下重力"
          value={config.gravity}
          min={0}
          max={20}
          step={0.2}
          display={`${config.gravity.toFixed(1)} m/s²`}
          disabled={locked}
          onChange={(value) => change('gravity', value)}
        />
            <p className="physics-hint">重力不直接消耗能量，但会让球持续向下聚集；调到 0 后是直线飞行，碰撞时改变方向。</p>
          </>
        )}
        <RangeControl
          label="碰撞繁殖概率"
          value={config.birthProbability}
          min={0}
          max={1}
          step={0.05}
          display={`${Math.round(config.birthProbability * 100)}%`}
          disabled={locked}
          onChange={(value) => change('birthProbability', value)}
        />
        <RangeControl
          label="同一球对冷却"
          value={config.pairCooldown}
          min={0.25}
          max={3}
          step={0.25}
          display={`${config.pairCooldown.toFixed(2)} s`}
          disabled={locked}
          onChange={(value) => change('pairCooldown', value)}
        />
      </div>

      <p className="panel-footnote">达到人口目标即结束。运行中参数锁定；重置后可以调整。</p>
    </section>
  );
}
