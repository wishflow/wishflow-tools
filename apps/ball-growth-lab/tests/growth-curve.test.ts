import assert from 'node:assert/strict';
import test from 'node:test';
import { CircleBatchSimulation } from '../src/physics/CircleBatchSimulation';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS } from '../src/types';

interface GrowthRun {
  times: Map<number, number>;
  finalPopulation: number;
  endReason: string | null;
}

function runGrowth(birthCooldown: number, maxPopulation = 1000, stopAtCheckpoints = true): GrowthRun {
  const simulation = new CircleBatchSimulation({
    ...DEFAULT_CONFIG,
    seed: 'BALL-0426',
    maxPopulation,
    birthProbability: 1,
    birthCooldown,
  });
  const thresholds = [10, 100, 900].filter((threshold) => threshold <= maxPopulation);
  const times = new Map<number, number>();

  try {
    for (let frame = 1; frame <= 300 / FIXED_STEP_SECONDS && !simulation.isEnded; frame += 1) {
      simulation.step(FIXED_STEP_SECONDS);
      for (const threshold of thresholds) {
        if (!times.has(threshold) && simulation.populationCount >= threshold) {
          times.set(threshold, frame * FIXED_STEP_SECONDS);
        }
      }
      if (stopAtCheckpoints && times.size === thresholds.length) break;
    }
    return {
      times,
      finalPopulation: simulation.populationCount,
      endReason: simulation.getSnapshot().endReason,
    };
  } finally {
    simulation.dispose();
  }
}

function thresholdTimes(birthCooldown: number, maxPopulation = 1000): Map<number, number> {
  return runGrowth(birthCooldown, maxPopulation).times;
}

test('繁殖概率为 100% 时，单球冷却使人均增长率不过度加速', () => {
  assert.equal(DEFAULT_CONFIG.birthProbability, 1);
  const times = thresholdTimes(8);
  assert.deepEqual([...times.keys()], [10, 100, 900], 'the fixed seed must reach all population checkpoints');

  const earlyLogRate = Math.log(100 / 10) / (times.get(100)! - times.get(10)!);
  const lateLogRate = Math.log(900 / 100) / (times.get(900)! - times.get(100)!);
  const lateToEarlyRateRatio = lateLogRate / earlyLogRate;

  assert.ok(
    lateToEarlyRateRatio <= 1.5,
    `late per-capita growth rate should remain near the early rate, got ${lateToEarlyRateRatio.toFixed(2)}x`,
  );
});

test('较长的单球繁殖冷却会延长达到人口目标所需的模拟时间', () => {
  const standardCooldownTime = thresholdTimes(4).get(900)!;
  const longerCooldownTime = thresholdTimes(12).get(900)!;

  assert.ok(
    longerCooldownTime > standardCooldownTime,
    `longer per-ball cooldown should slow growth, got ${longerCooldownTime}s vs ${standardCooldownTime}s`,
  );
});

test('人口上限限制最大人口并决定自动结束点', () => {
  const run = runGrowth(8, 100, false);
  assert.deepEqual([...run.times.keys()], [10, 100]);
  assert.equal(run.finalPopulation, 100);
  assert.equal(run.endReason, 'population-target');
});
