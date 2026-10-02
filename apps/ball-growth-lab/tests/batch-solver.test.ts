import assert from 'node:assert/strict';
import test from 'node:test';
import { CircleBatchSimulation } from '../scripts/experimental/CircleBatchSimulation';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS, type SimulationConfig, type SpawnSeed } from '../src/types';

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    ...DEFAULT_CONFIG,
    shape: 'square',
    gapCount: 0,
    ballDiameterRatio: 0.024,
    gapWidthRatio: 1.45,
    gravity: 0,
    restitution: 1,
    initialCount: 2,
    birthProbability: 0,
    pairCooldown: 0.5,
    maxPopulation: 10,
    seed: 'BATCH-TEST',
    ...overrides,
  };
}

function step(simulation: CircleBatchSimulation, count: number): void {
  for (let index = 0; index < count; index += 1) simulation.step(FIXED_STEP_SECONDS);
}

function movingPair(): SpawnSeed[] {
  return [
    { position: { x: -0.29, y: 0 }, velocity: { x: 1.5, y: 0 } },
    { position: { x: 0.29, y: 0 }, velocity: { x: -1.5, y: 0 } },
  ];
}

test('批量求解器按固定种子生成互不重叠的初始球', () => {
  const config = makeConfig({ initialCount: 24, maxPopulation: 30 });
  const first = new CircleBatchSimulation(config);
  const second = new CircleBatchSimulation(config);
  const firstBalls = first.getSnapshot().balls;
  const secondBalls = second.getSnapshot().balls;
  assert.deepEqual(firstBalls.map(({ x, y }) => [x, y]), secondBalls.map(({ x, y }) => [x, y]));

  for (let firstIndex = 0; firstIndex < firstBalls.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < firstBalls.length; secondIndex += 1) {
      const dx = firstBalls[firstIndex].x - firstBalls[secondIndex].x;
      const dy = firstBalls[firstIndex].y - firstBalls[secondIndex].y;
      assert.ok(Math.hypot(dx, dy) >= firstBalls[firstIndex].radius * 2 - 1e-6);
    }
  }
  first.dispose();
  second.dispose();
});

test('弹性正碰后两球交换运动方向', () => {
  const simulation = new CircleBatchSimulation(makeConfig(), movingPair());
  step(simulation, 30);
  const balls = simulation.getSnapshot().balls;
  assert.ok(balls[0].x < 0, `expected first ball to rebound left, got ${balls[0].x}`);
  assert.ok(balls[1].x > 0, `expected second ball to rebound right, got ${balls[1].x}`);
  simulation.dispose();
});

test('首次碰撞繁殖并服从人口上限', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ birthProbability: 1, maxPopulation: 3 }), movingPair());
  step(simulation, 12);
  const stats = simulation.getSnapshot().stats;
  assert.equal(stats.births, 1);
  assert.equal(stats.currentCount, 3);
  simulation.dispose();
});

test('穿过方形底部缺口的球会移除并计数', () => {
  const simulation = new CircleBatchSimulation(
    makeConfig({ gapCount: 2, gapWidthRatio: 2 }),
    [{ position: { x: 0, y: 9.5 }, velocity: { x: 0, y: 8 } }],
  );
  step(simulation, 30);
  const stats = simulation.getSnapshot().stats;
  assert.equal(stats.currentCount, 0);
  assert.equal(stats.exits, 1);
  simulation.dispose();
});

test('人口达到上限后将碰撞生育记为未出生', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ birthProbability: 1, maxPopulation: 2 }), movingPair());
  step(simulation, 12);
  const stats = simulation.getSnapshot().stats;
  assert.equal(stats.currentCount, 2);
  assert.equal(stats.births, 0);
  assert.equal(stats.missedBirths, 1);
  simulation.dispose();
});
