import assert from 'node:assert/strict';
import test from 'node:test';
import { CircleBatchSimulation } from '../src/physics/CircleBatchSimulation';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS } from '../src/types';

interface GrowthRun {
  times: Map<number, number>;
  finalPopulation: number;
  endReason: string | null;
  initialMeanSpeed: number;
  finalMeanSpeed: number;
  collisionEvents: number;
  birthGraceSuppressed: number;
  birthAttempts: number;
  births: number;
  missedSpaceBirths: number;
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
  const initialStats = simulation.getStatsSnapshot();
  const times = new Map<number, number>(
    thresholds.filter((threshold) => threshold <= initialStats.currentCount).map((threshold) => [threshold, 0]),
  );
  const initialMeanSpeed = initialStats.speedSum / Math.max(1, initialStats.currentCount);

  try {
    for (let frame = 1; frame <= 300 / FIXED_STEP_SECONDS && !simulation.isEnded; frame += 1) {
      simulation.step(FIXED_STEP_SECONDS);
      const currentPopulation = simulation.populationCount;
      for (const threshold of thresholds) {
        if (!times.has(threshold) && currentPopulation >= threshold) {
          times.set(threshold, frame * FIXED_STEP_SECONDS);
        }
      }
      if (stopAtCheckpoints && times.size === thresholds.length) break;
    }
    const stats = simulation.getStatsSnapshot();
    return {
      times,
      finalPopulation: simulation.populationCount,
      endReason: simulation.getSnapshot().endReason,
      initialMeanSpeed,
      finalMeanSpeed: stats.speedSum / Math.max(1, stats.currentCount),
      collisionEvents: stats.collisionEvents,
      birthGraceSuppressed: stats.birthGraceSuppressed,
      birthAttempts: stats.birthAttempts,
      births: stats.births,
      missedSpaceBirths: stats.missedSpaceBirths,
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

test('推荐默认参数在 1×、100% 繁殖、零冷却下 30–60 秒达到人口上限且增长平缓', () => {
  assert.equal(DEFAULT_CONFIG.birthProbability, 1);
  assert.equal(DEFAULT_CONFIG.birthCooldown, 0);
  assert.equal(DEFAULT_CONFIG.pairCooldown, 0);
  assert.equal(DEFAULT_CONFIG.gravity, 0.03);
  assert.equal(DEFAULT_CONFIG.initialSpeed, 0.8);
  assert.equal(DEFAULT_CONFIG.speedSpread, 0.3);
  assert.equal(DEFAULT_CONFIG.directionSpread, 180);
  assert.equal(DEFAULT_CONFIG.restitution, 1);
  assert.equal(DEFAULT_CONFIG.ballDiameterRatio, 0.028);
  assert.equal(DEFAULT_CONFIG.initialCount, 10);
  assert.equal(DEFAULT_CONFIG.maxPopulation, 40);

  const run = runGrowth(DEFAULT_CONFIG.birthCooldown, DEFAULT_CONFIG.maxPopulation, false, [20, 36, DEFAULT_CONFIG.maxPopulation]);
  const repeat = runGrowth(DEFAULT_CONFIG.birthCooldown, DEFAULT_CONFIG.maxPopulation, false, [20, 36, DEFAULT_CONFIG.maxPopulation]);
  const duration = run.times.get(DEFAULT_CONFIG.maxPopulation);
  const t10 = run.times.get(10);
  const t20 = run.times.get(20);
  const t36 = run.times.get(36);

  assert.equal(run.endReason, 'population-target');
  assert.ok(duration !== undefined && duration >= 30 && duration <= 60, `expected 30–60 s to target, got ${duration}s`);
  assert.ok(t10 !== undefined && t20 !== undefined && t36 !== undefined, 'expected 10, 20, and 36 ball checkpoints');
  assert.ok(t36 - t10 >= 25, `expected at least 25 s from 10 to 36 balls, got ${t36 - t10}s`);
  const earlyLogGrowthRate = Math.log(20 / 10) / (t20 - t10);
  const lateLogGrowthRate = Math.log(36 / 20) / (t36 - t20);
  assert.ok(
    lateLogGrowthRate / earlyLogGrowthRate <= 1.5,
    `late per-capita growth rate should remain near the early rate, got ${(lateLogGrowthRate / earlyLogGrowthRate).toFixed(2)}x`,
  );
  assert.deepEqual([...repeat.times], [...run.times], 'fixed initial conditions must reproduce the same checkpoints');
  assert.equal(repeat.collisionEvents, run.collisionEvents);
  assert.equal(repeat.births, run.births);
  assert.equal(
    run.collisionEvents,
    run.birthGraceSuppressed + run.birthAttempts,
    'each detected contact surface is either a birth attempt or an immediate parent-child contact protected from rebirth',
  );
  assert.equal(run.birthAttempts, run.births, 'all default-seed births should have a valid location below the population cap');
  assert.equal(run.missedSpaceBirths, 0);
  assert.ok(run.finalMeanSpeed / run.initialMeanSpeed >= 0.8 && run.finalMeanSpeed / run.initialMeanSpeed <= 1.25,
    `expected mean speed to stay near its initial value, got ${(run.finalMeanSpeed / run.initialMeanSpeed).toFixed(2)}x`);
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
