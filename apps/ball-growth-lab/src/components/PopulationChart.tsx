import type { GrowthPredictionPoint } from '../growthModel';

interface Sample {
  time: number;
  count: number;
}

function pointX(time: number, start: number, end: number): number {
  return end <= start ? 50 : ((time - start) / (end - start)) * 100;
}

function pointY(population: number, maximum: number): number {
  return 76 - (population / maximum) * 68;
}

export function PopulationChart({
  samples,
  active,
  prediction,
  predictionValidated,
  modelAccepted,
}: {
  samples: Sample[];
  active: boolean;
  prediction: GrowthPredictionPoint[];
  predictionValidated: boolean;
  modelAccepted: boolean;
}) {
  const visible = samples.slice(-48);
  const latestTime = visible.at(-1)?.time ?? 0;
  const endTime = Math.max(24, latestTime);
  const startTime = Math.max(0, endTime - 24);
  const visibleActual = visible.filter((sample) => sample.time >= startTime - 1e-9 && sample.time <= endTime + 1e-9);
  const visiblePrediction = prediction.filter((sample) => sample.time >= startTime && sample.time <= endTime);
  const max = Math.max(5, ...visibleActual.map((sample) => sample.count), ...visiblePrediction.map((sample) => sample.p90));
  const actualPoints = visibleActual.map((sample) => `${pointX(sample.time, startTime, endTime).toFixed(2)},${pointY(sample.count, max).toFixed(2)}`);
  const actualLine = actualPoints.join(' ');
  const upper = visiblePrediction.map((sample) => `${pointX(sample.time, startTime, endTime).toFixed(2)},${pointY(sample.p90, max).toFixed(2)}`);
  const lower = visiblePrediction.slice().reverse().map((sample) => `${pointX(sample.time, startTime, endTime).toFixed(2)},${pointY(sample.p10, max).toFixed(2)}`);
  const band = [...upper, ...lower].join(' ');
  const median = visiblePrediction.map((sample) => `${pointX(sample.time, startTime, endTime).toFixed(2)},${pointY(sample.p50, max).toFixed(2)}`).join(' ');
  const currentCount = visible.at(-1)?.count ?? 0;
  const predictionStatus = prediction.length === 0
    ? modelAccepted ? '当前没有可用预测' : '候选模型尚未通过校准'
    : !modelAccepted ? '模型尚未通过留出验证'
      : predictionValidated ? '预测范围已验证' : '当前参数超出验证范围';

  return (
    <figure className="population-chart-figure">
      <div className="chart-heading">
        <div>
          <p className="overline">球群变化 · 最近 24 秒</p>
          <h3>实际曲线与预测范围</h3>
        </div>
        {visible.length > 0 && <strong>{currentCount}<span> 个</span></strong>}
      </div>
      <svg className="population-chart" viewBox="0 0 100 84" preserveAspectRatio="none" role="img" aria-label="球群实际数量曲线与回归模型 P10 至 P90 预测范围">
        <path className="chart-gridline" d="M0 8H100 M0 42H100 M0 76H100" />
        {visiblePrediction.length > 1 && <polygon className={`chart-prediction-band${predictionValidated && modelAccepted ? '' : ' is-unvalidated'}`} points={band} />}
        {visiblePrediction.length > 1 && <polyline className={`chart-prediction-median${modelAccepted ? '' : ' is-unvalidated'}`} points={median} />}
        {visibleActual.length > 1 && <polyline className="chart-line" points={actualLine} />}
        {visibleActual.length === 1 && <circle className="chart-dot" cx={pointX(visibleActual[0].time, startTime, endTime)} cy={pointY(visibleActual[0].count, max)} r="1.8" />}
        {!active && visibleActual.length === 0 && <text x="50" y="45" textAnchor="middle" className="chart-empty">开始后显示数量变化</text>}
      </svg>
      <div className="chart-legend" aria-label={predictionStatus}>
        <span><i className="legend-actual" />实际</span>
        <span><i className="legend-median" />P50 中位</span>
        <span><i className={`legend-band${predictionValidated && modelAccepted ? '' : ' is-unvalidated'}`} />模型 P10–P90</span>
        <span className={predictionValidated && modelAccepted ? 'prediction-status' : 'prediction-status is-unvalidated'}>{predictionStatus}</span>
      </div>
      <figcaption><span>{startTime.toFixed(0)} 秒</span><span>时间</span><span>{endTime.toFixed(0)} 秒</span></figcaption>
    </figure>
  );
}
