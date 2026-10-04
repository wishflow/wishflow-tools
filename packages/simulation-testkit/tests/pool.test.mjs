import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { SimulationWorkerPool } from '../src/index.mjs';

test('bounded worker pool runs isolated, deterministic scenarios and reports failures without retry', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'simulation-testkit-'));
  const adapterPath = path.join(directory, 'scenario.mjs');
  await writeFile(adapterPath, `
    export function createScenario() {
      let calls = 0;
      return { async runScenario(config, seed, options) {
      calls += 1;
      const counters = config.counters ? new Int32Array(config.counters) : null;
      if (counters) {
        const active = Atomics.add(counters, 0, 1) + 1;
        let maximum = Atomics.load(counters, 1);
        while (active > maximum) {
          const previous = Atomics.compareExchange(counters, 1, maximum, active);
          if (previous === maximum) break;
          maximum = previous;
        }
        if (config.barrier) {
          Atomics.add(counters, 2, 1);
          Atomics.notify(counters, 2);
          while (Atomics.load(counters, 2) < 2) Atomics.wait(counters, 2, 1, 1000);
        }
      }
      try {
        await new Promise((resolve) => setTimeout(resolve, config.delay));
      } finally {
        if (counters) Atomics.sub(counters, 0, 1);
      }
      if (config.fail) throw new Error('failed ' + seed);
      return { timeSeries: [{ time: 0, population: config.population }], endReason: 'fixture', metrics: { seedValue: seed.length, copied: options.value, isolatedCalls: calls } };
      } };
    }
  `);
  const pool = new SimulationWorkerPool({ size: 2, scenario: { moduleUrl: pathToFileURL(adapterPath).href } });
  try {
    const scenario = pool.createScenario();
    const counters = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 3);
    const outcomes = await scenario.runBatch([
      { config: { delay: 15, population: 3, counters, barrier: true }, seed: 'A', sampleOptions: { value: 7 } },
      { config: { delay: 2, population: 5, counters, barrier: true }, seed: 'B', sampleOptions: { value: 9 } },
      { config: { delay: 10, fail: true, counters }, seed: 'FAIL' },
      { config: { delay: 10, population: 8, counters }, seed: 'C' },
    ]);
    assert.deepEqual(outcomes.map((outcome) => outcome.id), [
      'scenario-000001-A', 'scenario-000002-B', 'scenario-000003-FAIL', 'scenario-000004-C',
    ]);
    assert.equal(outcomes[0].status, 'succeeded', JSON.stringify(outcomes));
    assert.equal(outcomes[1].status, 'succeeded', JSON.stringify(outcomes));
    assert.equal(outcomes[0].result.timeSeries[0].population, 3);
    assert.equal(outcomes[1].result.metrics.copied, 9);
    assert.equal(outcomes[0].result.metrics.isolatedCalls, 1);
    assert.equal(outcomes[1].result.metrics.isolatedCalls, 1);
    assert.equal(outcomes[2].status, 'failed');
    assert.equal(outcomes[2].seed, 'FAIL');
    assert.match(outcomes[2].error.message, /failed FAIL/);
    assert.equal(outcomes[3].result.timeSeries[0].population, 8);
    assert.equal(outcomes.filter((outcome) => outcome.status === 'succeeded').length, 3);
    assert.equal(Atomics.load(new Int32Array(counters), 1), 2);
  } finally {
    await pool.close();
    await rm(directory, { recursive: true, force: true });
  }
});
