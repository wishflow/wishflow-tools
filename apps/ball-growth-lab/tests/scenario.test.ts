import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { SimulationWorkerPool } from '@wishflow/simulation-testkit';
import { DEFAULT_CONFIG } from '../src/types';

test('production scenario adapter runs the real simulation through the reusable worker pool', async () => {
  const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const pool = new SimulationWorkerPool({
    size: 1,
    scenario: { moduleUrl: pathToFileURL(path.join(appDirectory, 'src/scenario.ts')).href },
  });
  try {
    const outcomes = await pool.createScenario().runBatch([
      { config: { ...DEFAULT_CONFIG, initialCount: 2, maxPopulation: 10 }, seed: 'TEST-SCENARIO-01', sampleOptions: { sampleIntervalSeconds: 0.25, maxElapsedSeconds: 3 } },
      { config: { ...DEFAULT_CONFIG, initialCount: 2, maxPopulation: 10 }, seed: 'TEST-SCENARIO-01', sampleOptions: { sampleIntervalSeconds: 0.25, maxElapsedSeconds: 3 } },
    ]);
    const [outcome, replay] = outcomes;
    assert.equal(outcome.status, 'succeeded');
    if (outcome.status !== 'succeeded') return;
    assert.equal(replay.status, 'succeeded');
    if (replay.status !== 'succeeded') return;
    assert.equal(outcome.seed, 'TEST-SCENARIO-01');
    assert.deepEqual(outcome.result, replay.result);
    assert.equal(outcome.result.timeSeries[0].population, 2);
    assert.ok(outcome.result.timeSeries.length >= 2);
    assert.equal(outcome.result.metrics.elapsedSeconds, outcome.result.timeSeries.at(-1)?.time);
    const { t10Seconds, t90Seconds, t10To90Seconds } = outcome.result.metrics;
    if (typeof t10Seconds === 'number' && typeof t90Seconds === 'number' && t90Seconds > t10Seconds) {
      assert.equal(t10To90Seconds, t90Seconds - t10Seconds);
    } else {
      assert.equal(t10To90Seconds, null);
    }
    assert.ok(['observation-window', 'population-target', 'single-ball', 'no-balls'].includes(outcome.result.endReason ?? ''));
  } finally {
    await pool.close();
  }
});
