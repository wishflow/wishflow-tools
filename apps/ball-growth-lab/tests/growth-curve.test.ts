import assert from 'node:assert/strict';
import test from 'node:test';
import { CircleBatchSimulation } from '../src/physics/CircleBatchSimulation';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS } from '../src/types';

function thresholdTimes(birthProbability = DEFAULT_CONFIG.birthProbability): Map<number, number> {
  const simulation = new CircleBatchSimulation({
    ...DEFAULT_CONFIG,
    seed: 'BALL-0426',
    maxPopulation: 1000,
    birthProbability,
  });
  const thresholds = [10, 100, 900];
  const times = new Map<number, number>();

  try {
    for (let frame = 1; frame <= 300 / FIXED_STEP_SECONDS && !simulation.isEnded; frame += 1) {
      simulation.step(FIXED_STEP_SECONDS);
      for (const threshold of thresholds) {
        if (!times.has(threshold) && simulation.populationCount >= threshold) {
          times.set(threshold, frame * FIXED_STEP_SECONDS);
        }
      }
      if (times.size === thresholds.length) break;
    }
  } finally {
    simulation.dispose();
  }

  return times;
}

test('碰撞繁殖默认曲线保持近似恒定的人均增长率', () => {
  const times = thresholdTimes();
  assert.deepEqual([...times.keys()], [10, 100, 900], 'the fixed seed must reach all population checkpoints');

  const earlyLogRate = Math.log(100 / 10) / (times.get(100)! - times.get(10)!);
  const lateLogRate = Math.log(900 / 100) / (times.get(900)! - times.get(100)!);
  const lateToEarlyRateRatio = lateLogRate / earlyLogRate;

  assert.ok(
    lateToEarlyRateRatio <= 1.5,
    `late per-capita growth rate should remain near the early rate, got ${lateToEarlyRateRatio.toFixed(2)}x`,
  );
});

test('基准繁殖概率可以调节达到人口目标所需的模拟时间', () => {
  const standardProbabilityTime = thresholdTimes(0.35).get(900)!;
  const lowerProbabilityTime = thresholdTimes(0.175).get(900)!;

  assert.ok(
    lowerProbabilityTime > standardProbabilityTime,
    `lower baseline probability should slow growth, got ${lowerProbabilityTime}s vs ${standardProbabilityTime}s`,
  );
});
