export function percentile(values, quantile) {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(quantile * sorted.length) - 1));
  return sorted[index];
}

export function timeToThreshold(timeSeries, threshold) {
  return timeSeries.find((point) => point.population >= threshold)?.time ?? null;
}

export function kaplanMeierQuantile(observations, quantile) {
  if (quantile <= 0 || quantile > 1) throw new RangeError('quantile must be in (0, 1].');
  const sorted = [...observations].sort((first, second) => first.time - second.time);
  let atRisk = sorted.length;
  let survival = 1;
  for (let index = 0; index < sorted.length;) {
    const time = sorted[index].time;
    let events = 0;
    let censored = 0;
    while (index < sorted.length && sorted[index].time === time) {
      if (sorted[index].event) events += 1;
      else censored += 1;
      index += 1;
    }
    if (atRisk > 0 && events > 0) survival *= 1 - events / atRisk;
    if (1 - survival >= quantile) return time;
    atRisk -= events + censored;
  }
  return null;
}

export function summarizeRuns(outcomes) {
  const succeeded = outcomes.filter((outcome) => outcome.status === 'succeeded');
  const byEndReason = {};
  const metricValues = new Map();
  for (const outcome of succeeded) {
    const reason = outcome.result.endReason ?? 'unknown';
    byEndReason[reason] = (byEndReason[reason] ?? 0) + 1;
    for (const [name, value] of Object.entries(outcome.result.metrics ?? {})) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (!metricValues.has(name)) metricValues.set(name, []);
      metricValues.get(name).push(value);
    }
  }
  return {
    succeeded: succeeded.length,
    failed: outcomes.length - succeeded.length,
    byEndReason,
    metricQuantiles: Object.fromEntries([...metricValues].map(([name, values]) => [name, {
      p10: percentile(values, 0.1),
      p50: percentile(values, 0.5),
      p90: percentile(values, 0.9),
    }])),
  };
}

export function exportResults(outcomes, format = 'json') {
  if (format === 'json') return JSON.stringify({ format: 'simulation-testkit.results', version: 1, outcomes }, null, 2);
  if (format !== 'csv') throw new TypeError(`Unsupported export format: ${format}`);
  const columns = [
    'id', 'status', 'seed', 'endReason', 'elapsedSeconds', 'firstBirthSeconds', 'finalPopulation',
    'births', 'birthAttempts', 'missedSpaceBirths', 'exits', 'collisionEvents', 'cooldownAccepted',
    'cooldownRejected', 'birthProbabilityPassed', 'birthSpaceAttempts', 'meanSpeed', 'error',
  ];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = outcomes.map((outcome) => {
    const result = outcome.status === 'succeeded' ? outcome.result : null;
    const finalPoint = result?.timeSeries?.at(-1);
    const metrics = result?.metrics ?? {};
    return [
      outcome.id, outcome.status, outcome.seed, result?.endReason, metrics.elapsedSeconds, metrics.firstBirthSeconds,
      finalPoint?.population ?? metrics.finalPopulation, metrics.births, metrics.birthAttempts, metrics.missedSpaceBirths,
      metrics.exits, metrics.collisionEvents, metrics.cooldownAccepted, metrics.cooldownRejected,
      metrics.birthProbabilityPassed, metrics.birthSpaceAttempts, metrics.meanSpeed,
      outcome.status === 'failed' ? outcome.error.message : '',
    ];
  });
  return [columns.map(quote).join(','), ...rows.map((row) => row.map(quote).join(','))].join('\n');
}
