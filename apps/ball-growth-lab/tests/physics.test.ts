import assert from 'node:assert/strict';
import test from 'node:test';
import { PlanckSimulation } from '../scripts/experimental/PlanckSimulation';
import { PairCooldown } from '../src/physics/PairCooldown';
import { createBirthVelocity, distributeBirthEnergy, shareBirthMomentum } from '../src/physics/PhysicsAdapter';
import { SpatialHash } from '../src/physics/SpatialHash';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS, type Point, type SimulationConfig, type SpawnSeed } from '../src/types';

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    ...DEFAULT_CONFIG,
    gravity: 0,
    restitution: 1,
    initialCount: 2,
    birthProbability: 0,
    pairCooldown: 0.5,
    maxPopulation: 10,
    gapCount: 0,
    ...overrides,
  };
}

function movingPair(): SpawnSeed[] {
  return [
    { position: { x: -0.29, y: 0 }, velocity: { x: 1.5, y: 0 } },
    { position: { x: 0.29, y: 0 }, velocity: { x: -1.5, y: 0 } },
  ];
}

function step(simulation: PlanckSimulation, count: number): void {
  for (let index = 0; index < count; index += 1) simulation.step(FIXED_STEP_SECONDS);
}

function vectorSum(vectors: Point[]): Point {
  return vectors.reduce((sum, vector) => ({ x: sum.x + vector.x, y: sum.y + vector.y }), { x: 0, y: 0 });
}

function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

test('子球速率平方在碰后父球速率平方之间均匀抽样', () => {
  const sampleCount = 1000;
  const randomValues = Array.from({ length: sampleCount }, (_, index) => [
    (index + 0.5) / sampleCount,
    0,
  ]).flat();
  const random = sequenceRandom(randomValues);
  const squaredSpeeds = Array.from({ length: sampleCount }, () => {
    const velocity = createBirthVelocity(3, 5, 0, random);
    return velocity.x ** 2 + velocity.y ** 2;
  });

  assert.ok(squaredSpeeds.every((value) => value >= 9 && value <= 25));
  const meanSquaredSpeed = squaredSpeeds.reduce((sum, value) => sum + value, 0) / sampleCount;
  assert.ok(Math.abs(meanSquaredSpeed - 17) < 1e-10);
});

test('零重力方向覆盖全圆，正重力方向限定在朝上的 90° 扇区', () => {
  const zeroGravityDirections = [0, 0.25, 0.5, 0.75].map((directionSample) => {
    const velocity = createBirthVelocity(4, 4, 0, sequenceRandom([0, directionSample]));
    return (Math.atan2(velocity.y, velocity.x) * 180 / Math.PI + 360) % 360;
  });
  assert.deepEqual(zeroGravityDirections, [0, 90, 180, 270]);

  for (const directionSample of [0, 0.25, 0.5, 0.75, 1]) {
    const velocity = createBirthVelocity(4, 4, 9.8, sequenceRandom([0, directionSample]));
    const angle = (Math.atan2(velocity.y, velocity.x) * 180 / Math.PI + 360) % 360;
    assert.ok(velocity.y < 0);
    assert.ok(angle >= 225 - 1e-10 && angle <= 315 + 1e-10);
  }
});

test('零速父球生成零速子球', () => {
  assert.deepEqual(createBirthVelocity(0, 0, 9.8, sequenceRandom([0.5, 0.5])), { x: 0, y: 0 });
});

test('空场地的初始球不重叠，固定种子的位置可复现', () => {
  const config = makeConfig({ initialCount: 24, seed: 'PACK-TEST' });
  const first = new PlanckSimulation(config);
  const second = new PlanckSimulation(config);
  const balls = first.getSnapshot().balls;

  assert.equal(balls.length, 24);
  assert.deepEqual(balls.map(({ x, y }) => [x, y]), second.getSnapshot().balls.map(({ x, y }) => [x, y]));
  for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1) {
      const dx = balls[firstIndex].x - balls[secondIndex].x;
      const dy = balls[firstIndex].y - balls[secondIndex].y;
      assert.ok(Math.hypot(dx, dy) >= balls[firstIndex].radius * 2 - 1e-6);
    }
  }
  first.dispose();
  second.dispose();
});

test('反弹后球体交换运动方向', () => {
  const simulation = new PlanckSimulation(makeConfig(), movingPair());
  step(simulation, 30);
  const [first, second] = simulation.getSnapshot().balls;

  assert.ok(first.x < 0, `expected first ball to rebound left, got ${first.x}`);
  assert.ok(second.x > 0, `expected second ball to rebound right, got ${second.x}`);
  simulation.dispose();
});

test('繁殖概率为 0 时不出生；概率为 1 时碰撞会产生一个新球', () => {
  const noBirth = new PlanckSimulation(makeConfig({ birthProbability: 0 }), movingPair());
  step(noBirth, 12);
  assert.equal(noBirth.getSnapshot().stats.births, 0);
  noBirth.dispose();

  const birth = new PlanckSimulation(makeConfig({ birthProbability: 1, maxPopulation: 3 }), movingPair());
  step(birth, 12);
  assert.equal(birth.getSnapshot().stats.births, 1);
  assert.equal(birth.getSnapshot().stats.currentCount, 3);
  birth.dispose();
});

test('达到人口上限时计入未出生次数，并阻止超额新增', () => {
  const simulation = new PlanckSimulation(makeConfig({ birthProbability: 1, maxPopulation: 2 }), movingPair());
  step(simulation, 12);
  const stats = simulation.getSnapshot().stats;

  assert.equal(stats.currentCount, 2);
  assert.equal(stats.births, 0);
  assert.equal(stats.missedBirths, 1);
  simulation.dispose();
});

test('球从底部缺口离场后被移除并计数', () => {
  const seeds = [{ position: { x: 0, y: 9.5 }, velocity: { x: 0, y: 8 } }];
  const simulation = new PlanckSimulation(makeConfig({ gapCount: 2, gapWidthRatio: 2 }), seeds);
  step(simulation, 30);
  const stats = simulation.getSnapshot().stats;

  assert.equal(stats.currentCount, 0);
  assert.equal(stats.exits, 1);
  simulation.dispose();
});

test('新增等质量子球后总线动量保持', () => {
  const first = { x: 2.4, y: -0.7 };
  const second = { x: -0.5, y: 1.1 };
  const before = vectorSum([first, second]);
  const after = shareBirthMomentum(first, second);
  const afterTotal = vectorSum([after.first, after.second, after.child]);

  assert.ok(Math.abs(afterTotal.x - before.x) < 1e-12);
  assert.ok(Math.abs(afterTotal.y - before.y) < 1e-12);
});

test('球群繁殖时按父球动量和新球重力势能重新分配动能', () => {
  const first = { x: 2, y: 3 };
  const second = { x: -1, y: 2 };
  const gravity = 2;
  const childY = -2;
  const result = distributeBirthEnergy(first, second, gravity, childY, 0.7);

  assert.ok(result);
  assert.ok(Math.abs(result.first.x + result.second.x + result.child.x - first.x - second.x) < 1e-12);
  assert.ok(Math.abs(result.first.y + result.second.y + result.child.y - first.y - second.y) < 1e-12);

  const kineticBefore = (first.x ** 2 + first.y ** 2 + second.x ** 2 + second.y ** 2) / 2;
  const kineticAfter = [result.first, result.second, result.child]
    .reduce((total, velocity) => total + (velocity.x ** 2 + velocity.y ** 2) / 2, 0);
  const mechanicalBefore = kineticBefore;
  const mechanicalAfter = kineticAfter - gravity * childY;
  assert.ok(Math.abs(mechanicalAfter - mechanicalBefore) < 1e-10);
});

test('高处繁殖所需能量不足时不凭空生成动能', () => {
  assert.equal(distributeBirthEnergy({ x: 0, y: 0 }, { x: 0, y: 0 }, 2, -2, 0), null);
});

test('繁殖冷却按无序球对计算', () => {
  const cooldown = new PairCooldown();
  assert.equal(cooldown.shouldAccept(4, 9, 1, 0.5), true);
  assert.equal(cooldown.shouldAccept(9, 4, 1.2, 0.5), false);
  assert.equal(cooldown.shouldAccept(4, 9, 1.5, 0.5), true);
  cooldown.prune(8, 2);
  assert.equal(cooldown.shouldAccept(9, 4, 8, 0.5), true);
});

test('空间哈希只把临近同尺寸球判为重叠', () => {
  const hash = new SpatialHash(0.5);
  hash.insert(1, { x: -0.1, y: 0 });
  assert.equal(hash.overlaps({ x: 0.25, y: 0 }, 0.24), true);
  assert.equal(hash.overlaps({ x: 0.5, y: 0 }, 0.24), false);
});
