import type { ArenaShape, RunState, SimulationConfig } from '../types';

interface SetupPanelProps {
  config: SimulationConfig;
  runState: RunState;
  seedNotice: string;
  onChange: (config: SimulationConfig) => void;
  onStart: () => void;
  onReset: () => void;
  onNewSeed: () => void;
  onCopySeed: () => void;
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

function Icon({ name }: { name: 'copy' | 'shuffle' | 'play' | 'reset' }) {
  const paths = {
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    shuffle: <><path d="m16 3 4 4-4 4" /><path d="M4 7h2c5 0 7 10 12 10h2" /><path d="m16 13 4 4-4 4" /><path d="M4 17h2c1.7 0 3-1.2 4.1-2.8M14 9.8C15.1 8.2 16.4 7 18 7h2" /></>,
    play: <path d="m8 5 11 7-11 7z" />,
    reset: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function SetupPanel({ config, runState, seedNotice, onChange, onStart, onReset, onNewSeed, onCopySeed }: SetupPanelProps) {
  const locked = runState !== 'setup';
  const change = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => onChange({ ...config, [key]: value });

  return (
    <section className="setup-panel panel" aria-labelledby="setup-title">
      <header className="panel-heading">
        <div>
          <span className="section-glyph" aria-hidden="true">A</span>
          <div>
            <p className="overline">实验条件</p>
            <h2 id="setup-title">调一调，再观察</h2>
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
      </div>

      <div className="setting-group">
        <p className="group-title">场地</p>
        <ShapeChoice value={config.shape} disabled={locked} onChange={(value) => change('shape', value)} />
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
        <p className="group-title">球群与物理</p>
        <RangeControl
          label="初始球数"
          value={config.initialCount}
          min={2}
          max={Math.max(2, Math.min(100, config.maxPopulation))}
          step={1}
          display={`${config.initialCount} 个`}
          disabled={locked}
          onChange={(value) => change('initialCount', value)}
        />
        <RangeControl
          label="人口上限"
          value={config.maxPopulation}
          min={2}
          max={1000}
          step={1}
          display={`${config.maxPopulation} 个`}
          disabled={locked}
          onChange={(value) => onChange({
            ...config,
            maxPopulation: value,
            initialCount: Math.min(config.initialCount, value),
          })}
        />
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
        <RangeControl
          label="弹性"
          value={config.restitution}
          min={0.2}
          max={1}
          step={0.05}
          display={`${Math.round(config.restitution * 100)}%`}
          disabled={locked}
          onChange={(value) => change('restitution', value)}
        />
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

      {runState === 'setup' ? (
        <button type="button" className="primary-button start-button" onClick={onStart}>
          <Icon name="play" />开始实验
        </button>
      ) : (
        <button type="button" className="secondary-button start-button" onClick={onReset}>
          <Icon name="reset" />重置并调整参数
        </button>
      )}
      <p className="panel-footnote">开始后参数锁定。重置后可调整并复用相同种子。</p>
    </section>
  );
}
