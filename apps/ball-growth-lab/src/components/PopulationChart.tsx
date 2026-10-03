interface Sample {
  time: number;
  count: number;
}

export function PopulationChart({ samples, active }: { samples: Sample[]; active: boolean }) {
  const visible = samples.slice(-48);
  const max = Math.max(5, ...visible.map((sample) => sample.count));
  const points = visible.map((sample, index) => {
    const x = visible.length < 2 ? 50 : (index / (visible.length - 1)) * 100;
    const y = 76 - (sample.count / max) * 68;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = points.join(' ');
  const area = points.length > 0 ? `0,80 ${line} 100,80` : '';

  return (
    <figure className="population-chart-figure">
      <div className="chart-heading">
        <div>
          <p className="overline">球群变化</p>
          <h3>数量曲线</h3>
        </div>
        {visible.length > 0 && <strong>{visible.at(-1)?.count ?? 0}<span> 个</span></strong>}
      </div>
      <svg className="population-chart" viewBox="0 0 100 84" preserveAspectRatio="none" role="img" aria-label="球群数量随时间变化的折线图">
        <path className="chart-gridline" d="M0 8H100 M0 42H100 M0 76H100" />
        {visible.length > 1 && <polygon className="chart-area" points={area} />}
        {visible.length > 1 && <polyline className="chart-line" points={line} />}
        {visible.length === 1 && <circle className="chart-dot" cx={points[0].split(',')[0]} cy={points[0].split(',')[1]} r="1.8" />}
        {!active && visible.length === 0 && <text x="50" y="45" textAnchor="middle" className="chart-empty">开始后显示数量变化</text>}
      </svg>
      <figcaption><span>开始</span><span>时间</span><span>现在</span></figcaption>
    </figure>
  );
}
