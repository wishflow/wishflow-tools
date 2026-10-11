import assert from 'node:assert/strict';
import test from 'node:test';
import { CircleBatchSimulation } from '../src/physics/CircleBatchSimulation';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS } from '../src/types';

interface GrowthRun {
  times: Map<number, number>;
  finalPopulation: number;
  endReason: string | null;
  maxBirthsPerStep: number;
}

function runGrowth(
  birthCooldown: number,
  maxPopulation = 1000,
  stopAtCheckpoints = true,
  additionalThresholds: number[] = [],
  configOverrides: Partial<typeof DEFAULT_CONFIG> = {},
): GrowthRun {
  const simulation = new CircleBatchSimulation({
    ...DEFAULT_CONFIG,
    ...configOverrides,
    seed: 'BALL-0426',
    maxPopulation,
    birthProbability: 1,
    birthCooldown,
  });
  const thresholds = [10, 100, 900, ...additionalThresholds].filter((threshold, index, all) => threshold <= maxPopulation && all.indexOf(threshold) === index);
  const times = new Map<number, number>();
  let maxBirthsPerStep = 0;
  let previousPopulation = simulation.populationCount;

  try {
    for (let frame = 1; frame <= 300 / FIXED_STEP_SECONDS && !simulation.isEnded; frame += 1) {
      simulation.step(FIXED_STEP_SECONDS);
      const currentPopulation = simulation.populationCount;
      maxBirthsPerStep = Math.max(maxBirthsPerStep, currentPopulation - previousPopulation);
      previousPopulation = currentPopulation;
      for (const threshold of thresholds) {
        if (!times.has(threshold) && currentPopulation >= threshold) {
          times.set(threshold, frame * FIXED_STEP_SECONDS);
        }
      }
      if (stopAtCheckpoints && times.size === thresholds.length) break;
    }
    return {
      times,
      finalPopulation: simulation.populationCount,
      endReason: simulation.getSnapshot().endReason,
      maxBirthsPerStep,
    };
  } finally {
    simulation.dispose();
  }
}

function thresholdTimes(birthCooldown: number, maxPopulation = 1000, configOverrides: Partial<typeof DEFAULT_CONFIG> = {}): Map<number, number> {
  return runGrowth(birthCooldown, maxPopulation, true, [], configOverrides).times;
}

test('繁殖概率为 100% 时，单球冷却使人均增长率不过度加速', () => {
  assert.equal(DEFAULT_CONFIG.birthProbability, 1);
  const times = thresholdTimes(8, 1000, { restitution: 1, initialSpeed: 11 });
  assert.deepEqual([...times.keys()], [10, 100, 900], 'the fixed seed must reach all population checkpoints');

  const earlyLogRate = Math.log(100 / 10) / (times.get(100)! - times.get(10)!);
  const lateLogRate = Math.log(900 / 100) / (times.get(900)! - times.get(100)!);
  const lateToEarlyRateRatio = lateLogRate / earlyLogRate;

  assert.ok(
    lateToEarlyRateRatio <= 1.5,
    `late per-capita growth rate should remain near the early rate, got ${lateToEarlyRateRatio.toFixed(2)}x`,
  );
});

test('默认参数在 1×、100% 繁殖、零冷却下约 90 秒达到人口上限且不会瞬间暴增', () => {
  assert.equal(DEFAULT_CONFIG.birthProbability, 1);
  assert.equal(DEFAULT_CONFIG.birthCooldown, 0);
  assert.equal(DEFAULT_CONFIG.pairCooldown, 0);

  const run = runGrowth(DEFAULT_CONFIG.birthCooldown, DEFAULT_CONFIG.maxPopulation, false, [500, DEFAULT_CONFIG.maxPopulation]);
  const duration = run.times.get(DEFAULT_CONFIG.maxPopulation);
  const t10 = run.times.get(10);
  const t100 = run.times.get(100);
  const t900 = run.times.get(900);

  assert.equal(run.endReason, 'population-target');
  assert.ok(duration !== undefined && duration >= 80 && duration <= 100, `expected 80–100 s to target, got ${duration}s`);
  assert.ok(t100 !== undefined && t900 !== undefined && t900 - t100 >= 30, `expected at least 30 s from 100 to 900 balls, got ${t900! - t100!}s`);
  assert.ok(t10 !== undefined && t100 !== undefined && t900 !== undefined, 'expected 10, 100, and 900 ball checkpoints');
  const earlyLogGrowthRate = Math.log(100 / 10) / (t100 - t10);
  const lateLogGrowthRate = Math.log(900 / 100) / (t900 - t100);
  assert.ok(
    lateLogGrowthRate / earlyLogGrowthRate <= 1.5,
    `late per-capita growth rate should remain near the early rate, got ${(lateLogGrowthRate / earlyLogGrowthRate).toFixed(2)}x`,
  );
  assert.ok(run.maxBirthsPerStep <= 2, `expected no more than two births in a physics step, got ${run.maxBirthsPerStep}`);
});

test('较长的单球繁殖冷却会延长达到人口目标所需的模拟时间', () => {
  const standardCooldownTime = thresholdTimes(4, 1000, { restitution: 1, initialSpeed: 11 }).get(900)!;
  const longerCooldownTime = thresholdTimes(12, 1000, { restitution: 1, initialSpeed: 11 }).get(900)!;

  assert.ok(
    longerCooldownTime > standardCooldownTime,
    `longer per-ball cooldown should slow growth, got ${longerCooldownTime}s vs ${standardCooldownTime}s`,
  );
});

test('人口上限限制最大人口并决定自动结束点', () => {
  const run = runGrowth(DEFAULT_CONFIG.birthCooldown, 100, false);
  assert.deepEqual([...run.times.keys()], [10, 100]);
  assert.equal(run.finalPopulation, 100);
  assert.equal(run.endReason, 'population-target');
});
