import { useRef, type KeyboardEvent } from 'react';
import { MAX_ARENA_SIZE, MIN_ARENA_SIZE, type EndReason, type SimulationConfig, type SimulationStats } from '../types';

export type SetupTab = 'arena' | 'launch' | 'rules';

interface SetupPanelProps {
  config: SimulationConfig;
  activeTab: SetupTab;
  lastRun: { stats: SimulationStats; endReason: EndReason | null } | null;
  seedNotice: string;
  exportNotice: string;
  onTabChange: (tab: SetupTab) => void;
  onChange: (config: SimulationConfig) => void;
  onNewSeed: () => void;
  onCopySeed: () => void;
  onExportConfig: () => void;
  onCopyConfig: () => void;
  onExportLastRun: () => void;
  onStart: () => void;
}

const TABS: Array<{ id: SetupTab; number: string; label: string; note: string }> = [
  { id: 'arena', number: '01', label: '场地', note: '边界与球体尺寸' },
  { id: 'launch', number: '02', label: '发射', note: '数量、初速与方向' },
  { id: 'rules', number: '03', label: '规则', note: '重力、碰撞与终止' },
];

function endReasonLabel(reason: EndReason | null): string {
  switch (reason) {
    case 'population-target': return '达到人口目标';
    case 'single-ball': return '只剩一颗球';
    case 'no-balls': return '场内没有球';
    case 'manual': return '手动结束';
    default: return '本轮已结束';
  }
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  output,
  help,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  output: string;
  help?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span className="control-heading"><span>{label}</span><output>{output}</output></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      {help && <span className="control-help">{help}</span>}
    </label>
  );
}

function Icon({ name }: { name: 'shuffle' | 'copy' | 'download' }) {
  const paths = {
    shuffle: <><path d="m16 3 4 4-4 4" /><path d="M4 7h2c5 0 7 10 12 10h2" /><path d="m16 13 4 4-4 4" /><path d="M4 17h2c1.7 0 3-1.2 4.1-2.8M14 9.8C15.1 8.2 16.4 7 18 7h2" /></>,
    copy: <><rect x="8" y="8" width="11" height="12" rx="2" /><path d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    download: <><path d="M12 3v11m0 0 4-4m-4 4-4-4" /><path d="M5 16v4h14v-4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function SetupPanel({
  config,
  activeTab,
  lastRun,
  seedNotice,
  exportNotice,
  onTabChange,
  onChange,
  onNewSeed,
  onCopySeed,
  onExportConfig,
  onCopyConfig,
  onExportLastRun,
  onStart,
}: SetupPanelProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const change = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => onChange({ ...config, [key]: value });
  const initialMax = Math.max(2, Math.min(100, config.maxPopulation - 1));
  const directionNames = ['右', '右下', '下', '左下', '左', '左上', '上', '右上'];
  const directionName = directionNames[Math.round((config.initialDirection % 360) / 45) % directionNames.length];
  const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);

  const moveTabFocus = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex = activeIndex;
    if (event.key === 'ArrowRight') nextIndex = (activeIndex + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (activeIndex + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else return;
    event.preventDefault();
    const nextTab = TABS[nextIndex];
    onTabChange(nextTab.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <main className="setup-screen">
      <header className="setup-topbar">
        <a className="brand-link" href="../" aria-label="回到工具首页">
          <span className="brand-orbit" aria-hidden="true"><i /><i /><i /></span>
          <span className="brand-copy"><strong>球群生长</strong><small>碰撞 · 繁殖 · 观察</small></span>
        </a>
        <span className="setup-version">物理实验室 <b>V2</b></span>
      </header>

      <section className="setup-workspace" aria-labelledby="setup-title">
        <div className="setup-intro">
          <div>
            <p className="eyebrow">BALL GROWTH LAB <span>·</span> 准备新实验</p>
            <h1 id="setup-title">每次碰撞，都是下一步。</h1>
            <p className="intro-copy">调整实验条件，观察球群如何相遇、繁殖和离场。</p>
          </div>
          {lastRun && (
            <aside className="previous-run" aria-label="上一轮结果">
              <span>上一轮结果</span>
              <strong>{lastRun.stats.currentCount}<small> 颗球</small></strong>
              <span>{endReasonLabel(lastRun.endReason)} · {Math.floor(lastRun.stats.elapsedSeconds)} 秒</span>
              <button className="text-action" type="button" onClick={onExportLastRun}>导出上一轮记录 <Icon name="download" /></button>
            </aside>
          )}
        </div>

        <section className="setup-card" aria-label="实验参数">
          <div className="setup-card-top">
            <div className="seed-tools">
              <label htmlFor="seed-input">随机种子</label>
              <input
                id="seed-input"
                name="seed"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={20}
                value={config.seed}
                onChange={(event) => change('seed', event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
              />
              <button className="icon-action" type="button" aria-label="生成新种子" title="生成新种子" onClick={onNewSeed}><Icon name="shuffle" /></button>
              <button className="icon-action" type="button" aria-label="复制随机种子" title="复制随机种子" onClick={onCopySeed}><Icon name="copy" /></button>
              <span className="seed-feedback" aria-live="polite">{seedNotice || '同一参数和种子可重复实验'}</span>
            </div>
            <div className="export-tools">
              <button className="button button-soft" type="button" onClick={onExportConfig}><Icon name="download" />导出参数</button>
              <button className="button button-plain" type="button" onClick={onCopyConfig}>复制 JSON</button>
            </div>
          </div>

          <div className="setup-tabs" role="tablist" aria-label="实验设置分组">
            {TABS.map((tab, index) => (
              <button
                key={tab.id}
                ref={(element) => { tabRefs.current[index] = element; }}
                className={`setup-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={moveTabFocus}
              >
                <span className="tab-number">{tab.number}</span>
                <span className="tab-label">{tab.label}<small>{tab.note}</small></span>
                <span className="tab-chevron" aria-hidden="true">↗</span>
              </button>
            ))}
          </div>

          <div className="settings-panel" id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
            {activeTab === 'arena' && (
              <div className="control-grid">
                <RangeControl label="场地直径" value={config.arenaSize} min={MIN_ARENA_SIZE} max={MAX_ARENA_SIZE} step={1} output={`${config.arenaSize} m`} onChange={(value) => change('arenaSize', value)} />
                <RangeControl label="球体直径" value={config.ballDiameterRatio} min={0.012} max={0.036} step={0.002} output={`${(config.ballDiameterRatio * 100).toFixed(1)}%`} help="相对于场地直径" onChange={(value) => change('ballDiameterRatio', value)} />
                <RangeControl label="均匀分布的缺口" value={config.gapCount} min={0} max={8} step={1} output={`${config.gapCount} 个`} help="第一个缺口固定在正上方" onChange={(value) => change('gapCount', value)} />
                <RangeControl label="缺口宽度 / 球径" value={config.gapWidthRatio} min={1.05} max={3} step={0.05} output={`${config.gapWidthRatio.toFixed(2)}×`} disabled={config.gapCount === 0} help={config.gapCount === 0 ? '添加缺口后可调整' : '宽度按球径倍数计算'} onChange={(value) => change('gapWidthRatio', value)} />
              </div>
            )}
            {activeTab === 'launch' && (
              <div className="control-grid">
                <RangeControl label="初始球数" value={config.initialCount} min={2} max={initialMax} step={1} output={`${config.initialCount} 颗`} onChange={(value) => change('initialCount', value)} />
                <RangeControl label="初速度大小" value={config.initialSpeed} min={0} max={24} step={0.5} output={`${config.initialSpeed.toFixed(1)} m/s`} onChange={(value) => change('initialSpeed', value)} />
                <RangeControl label="速度随机扩散" value={config.speedSpread} min={0} max={1} step={0.05} output={`±${Math.round(config.speedSpread * 100)}%`} help="每颗球的速度会在范围内随机取值" onChange={(value) => change('speedSpread', value)} />
                <RangeControl label="初始方向" value={config.initialDirection} min={0} max={360} step={15} output={`${directionName} · ${config.initialDirection}°`} help="0° 向右 · 90° 向下 · 180° 向左 · 270° 向上" onChange={(value) => change('initialDirection', value)} />
                <RangeControl label="方向随机扩散" value={config.directionSpread} min={0} max={180} step={5} output={`±${config.directionSpread}°`} help="每颗球围绕初始方向随机偏转" onChange={(value) => change('directionSpread', value)} />
              </div>
            )}
            {activeTab === 'rules' && (
              <div className="control-grid">
                <RangeControl label="重力" value={config.gravity} min={0} max={20} step={0.2} output={`${config.gravity.toFixed(1)} m/s²`} help="0 时自由飞行是直线；有重力时形成抛物线" onChange={(value) => change('gravity', value)} />
                <RangeControl label="恢复系数" value={config.restitution} min={0} max={1} step={0.05} output={`${Math.round(config.restitution * 100)}%`} help="100% 表示理想弹性碰撞，不额外施加阻尼" onChange={(value) => change('restitution', value)} />
                <RangeControl label="碰撞繁殖概率" value={config.birthProbability} min={0} max={1} step={0.05} output={`${Math.round(config.birthProbability * 100)}%`} onChange={(value) => change('birthProbability', value)} />
                <RangeControl label="同一球对冷却" value={config.pairCooldown} min={0.25} max={3} step={0.25} output={`${config.pairCooldown.toFixed(2)} 秒`} help="冷却结束后，这一对球才可再次尝试繁殖" onChange={(value) => change('pairCooldown', value)} />
                <RangeControl label="人口目标" value={config.maxPopulation} min={3} max={1000} step={1} output={`${config.maxPopulation} 颗`} help="达到目标即结束；只剩一球或没有球也会结束" onChange={(value) => onChange({ ...config, maxPopulation: value, initialCount: Math.min(config.initialCount, value - 1) })} />
              </div>
            )}
          </div>

          <div className="settings-footnote"><span className="footnote-orbit" aria-hidden="true">↗</span><span>球会从场地上方出发。实验开始后参数锁定，结束后可返回修改。</span><span className="export-feedback" aria-live="polite">{exportNotice}</span></div>
        </section>
      </section>

      <footer className="setup-footer">
        <div className="start-summary"><span className="summary-orbit" aria-hidden="true"><i /><i /><i /></span><span><strong>{config.initialCount} 颗球</strong><small>直径 {config.arenaSize} m · 目标 {config.maxPopulation} 颗</small></span></div>
        <button className="button button-start" type="button" onClick={onStart}><span>开始实验</span><b aria-hidden="true">→</b></button>
      </footer>
    </main>
  );
}
