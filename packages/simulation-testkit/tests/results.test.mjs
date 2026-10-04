import assert from 'node:assert/strict';
import test from 'node:test';
import { exportResults, kaplanMeierQuantile, percentile, summarizeRuns, timeToThreshold } from '../src/index.mjs';

test('summarizes quantiles and threshold times and exports JSON/CSV', () => {
  const outcomes = [
    { id: 'a', status: 'succeeded', config: {}, seed: 'a', result: { timeSeries: [{ time: 0, population: 2 }, { time: 1, population: 10 }], endReason: 'target', metrics: { elapsedSeconds: 1, births: 8 } } },
    { id: 'b', status: 'succeeded', config: {}, seed: 'b', result: { timeSeries: [{ time: 0, population: 2 }, { time: 3, population: 10 }], endReason: 'target', metrics: { elapsedSeconds: 3, births: 8 } } },
    { id: 'c', status: 'failed', config: { a: 1 }, seed: 'c', error: { name: 'Error', message: 'example' } },
  ];
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2);
  assert.equal(timeToThreshold(outcomes[1].result.timeSeries, 10), 3);
  assert.equal(kaplanMeierQuantile([
    { time: 1, event: true },
    { time: 2, event: true },
    { time: 2, event: false },
    { time: 3, event: true },
  ], 0.5), 2);
  assert.deepEqual(summarizeRuns(outcomes).metricQuantiles.elapsedSeconds, { p10: 1, p50: 1, p90: 3 });
  assert.match(exportResults(outcomes, 'json'), /simulation-testkit\.results/);
  assert.match(exportResults(outcomes, 'csv'), /example/);
});
