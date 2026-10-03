import assert from 'node:assert/strict';
import test from 'node:test';
import * as RAPIER from '@dimforge/rapier2d-compat';
import { initializeRapier, RapierSimulation } from '../src/physics/RapierSimulation';
import { ARENA_HALF_EXTENT, DEFAULT_CONFIG, FIXED_STEP_SECONDS, type Point, type SimulationConfig, type SpawnSeed } from '../src/types';

await initializeRapier(RAPIER);

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

function movingPair(speed = 1.5): SpawnSeed[] {
  return [
    { position: { x: -0.29, y: 0 }, velocity: { x: speed, y: 0 } },
    { position: { x: 0.29, y: 0 }, velocity: { x: -speed, y: 0 } },
  ];
}

function step(simulation: RapierSimulation, count: number): void {
  for (let index = 0; index < count; index += 1) simulation.step(FIXED_STEP_SECONDS);
}

function distance(first: Point, second: Point): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function physicsBodies(simulation: RapierSimulation): Array<{ linvel(): Point; isSleeping(): boolean }> {
  const internals = simulation as unknown as { balls: Map<number, { body: { linvel(): Point; isSleeping(): boolean } }> };
  return [...internals.balls.values()].map(({ body }) => body);
}

function kineticEnergy(simulation: RapierSimulation): number {
  const internals = simulation as unknown as { balls: Map<number, { body: { mass(): number; linvel(): Point } }> };
  return [...internals.balls.values()].reduce((total, { body }) => {
    const velocity = body.linvel();
    return total + body.mass() * (velocity.x ** 2 + velocity.y ** 2) / 2;
  }, 0);
}

function energyState(simulation: RapierSimulation, gravity: number): { total: number; magnitude: number } {
  const internals = simulation as unknown as {
    balls: Map<number, { body: { mass(): number; translation(): Point; linvel(): Point } }>;
  };
  let total = 0;
  let magnitude = 0;
  for (const { body } of internals.balls.values()) {
    const mass = body.mass();
    const position = body.translation();
    const velocity = body.linvel();
    const kinetic = mass * (velocity.x ** 2 + velocity.y ** 2) / 2;
    const potential = -mass * gravity * position.y;
    total += kinetic + potential;
    magnitude += Math.abs(kinetic) + Math.abs(potential);
  }
  return { total, magnitude };
}

function denseSeeds(count: number, radius: number): SpawnSeed[] {
  const points: Point[] = [];
  const spacing = radius * 2.05;
  const rowSpacing = spacing * Math.sqrt(3) / 2;
  const limit = ARENA_HALF_EXTENT - radius - 0.15;
  const rows = Math.ceil(limit / rowSpacing);
  const columns = Math.ceil(limit / spacing);

  for (let row = -rows; row <= rows; row += 1) {
    for (let column = -columns; column <= columns; column += 1) {
      const point = { x: column * spacing + (Math.abs(row) % 2) * spacing / 2, y: row * rowSpacing };
      if (Math.hypot(point.x, point.y) > limit) continue;
      points.push(point);
    }
  }
  if (points.length < count) throw new Error(`场地无法放置 ${count} 个性能回归球。`);
  return Array.from({ length: count }, (_, index) => ({
    position: points[Math.floor(((index + 0.5) / count) * points.length)],
    velocity: { x: 0, y: 0 },
  }));
}

test('固定种子可复现，初始随机球位于上半场且不会重叠', () => {
  const config = makeConfig({ initialCount: 24, maxPopulation: 30, seed: 'RAPIER-PACK-TEST' });
  const first = new RapierSimulation(RAPIER, config);
  const second = new RapierSimulation(RAPIER, config);
  const balls = first.getSnapshot().balls;

  assert.deepEqual(balls.map(({ x, y }) => [x, y]), second.getSnapshot().balls.map(({ x, y }) => [x, y]));
  assert.ok(balls.every((ball) => ball.y < -ARENA_HALF_EXTENT * 0.35));
  assert.deepEqual(
    physicsBodies(first).map((body) => body.linvel()),
    physicsBodies(second).map((body) => body.linvel()),
  );
  for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < balls.length; secondIndex += 1) {
      assert.ok(distance(balls[firstIndex], balls[secondIndex]) >= balls[firstIndex].radius * 2 - 1e-6);
    }
  }
  first.dispose();
  second.dispose();
});

test('零重力时自由飞行走直线并保持速度', () => {
  const seeds = [
    { position: { x: -5, y: 0 }, velocity: { x: 4, y: 1 } },
    { position: { x: 5, y: 0 }, velocity: { x: 0, y: 0 } },
  ];
  const simulation = new RapierSimulation(RAPIER, makeConfig(), seeds);
  step(simulation, 120);
  const [moving] = simulation.getSnapshot().balls;
  const velocity = physicsBodies(simulation)[0].linvel();

  assert.ok(Math.abs(moving.x - (-3)) < 0.01);
  assert.ok(Math.abs(moving.y - 0.5) < 0.01);
  assert.ok(Math.abs(velocity.x - 4) < 1e-5);
  assert.ok(Math.abs(velocity.y - 1) < 1e-5);
  simulation.dispose();
});

test('可调重力产生加速度与弧线位移', () => {
  const seeds = [
    { position: { x: -5, y: 0 }, velocity: { x: 2, y: 0 } },
    { position: { x: 5, y: 0 }, velocity: { x: 0, y: 0 } },
  ];
  const simulation = new RapierSimulation(RAPIER, makeConfig({ gravity: 2 }), seeds);
  step(simulation, 240);
  const [moving] = simulation.getSnapshot().balls;
  const velocity = physicsBodies(simulation)[0].linvel();

  assert.ok(Math.abs(moving.x - (-3)) < 0.02);
  assert.ok(moving.y > 0.9 && moving.y < 1.1, `expected gravity displacement near 1m, got ${moving.y}`);
  assert.ok(velocity.y > 1.9 && velocity.y < 2.1);
  simulation.dispose();
});

test('恢复系数 1 的球碰撞反向且能量漂移受控', () => {
  const simulation = new RapierSimulation(RAPIER, makeConfig(), movingPair());
  const before = kineticEnergy(simulation);
  step(simulation, 120);
  const balls = simulation.getSnapshot().balls;
  const after = kineticEnergy(simulation);

  assert.ok(balls[0].x < 0, `expected first ball to rebound left, got ${balls[0].x}`);
  assert.ok(balls[1].x > 0, `expected second ball to rebound right, got ${balls[1].x}`);
  assert.ok(Math.abs(after - before) / before < 0.005, `elastic collision energy drift ${(after - before) / before}`);
  simulation.dispose();
});

test('恢复系数小于 1 时碰撞会按配置损失能量', () => {
  const simulation = new RapierSimulation(RAPIER, makeConfig({ restitution: 0.5 }), movingPair());
  const before = kineticEnergy(simulation);
  step(simulation, 30);
  const after = kineticEnergy(simulation);

  assert.ok(after < before * 0.5, `expected inelastic collision to reduce energy, ${before} -> ${after}`);
  simulation.dispose();
});

test('高速球自适应细分后不穿过彼此或圆形边界', () => {
  const simulation = new RapierSimulation(RAPIER, makeConfig(), [
    { position: { x: -0.6, y: 0 }, velocity: { x: 180, y: 0 } },
    { position: { x: 0.6, y: 0 }, velocity: { x: -180, y: 0 } },
  ]);
  step(simulation, 1);
  const [first, second] = simulation.getSnapshot().balls;
  assert.ok(first.x < second.x, `the fast balls crossed: ${first.x} / ${second.x}`);
  assert.ok(distance(first, second) >= first.radius * 2 - 0.01);
  assert.ok(simulation.getSnapshot().stats.maxSpeed > 100);
  simulation.dispose();

  const boundarySimulation = new RapierSimulation(RAPIER, makeConfig(), [
    { position: { x: 9.5, y: 0 }, velocity: { x: 180, y: 0 } },
    { position: { x: -5, y: 5 }, velocity: { x: 0, y: 0 } },
  ]);
  step(boundarySimulation, 1);
  const [ball] = boundarySimulation.getSnapshot().balls;
  assert.ok(ball.x < 9.5, `circle wall should rebound a fast ball, got x=${ball.x}`);
  boundarySimulation.dispose();
});

test('弹性圆形边界会把球反弹回场内', () => {
  const simulation = new RapierSimulation(RAPIER, makeConfig(), [
    { position: { x: 9.4, y: 0 }, velocity: { x: 3, y: 0 } },
    { position: { x: -5, y: 5 }, velocity: { x: 0, y: 0 } },
  ]);
  step(simulation, 120);
  const [ball] = simulation.getSnapshot().balls;
  assert.ok(ball.x < 9.4, `circle arena should rebound the ball inward, got x=${ball.x}`);
  simulation.dispose();
});

test('首次接触按概率繁殖，达到人口目标立即结束', () => {
  const noBirth = new RapierSimulation(RAPIER, makeConfig({ birthProbability: 0 }), movingPair());
  step(noBirth, 12);
  assert.equal(noBirth.getSnapshot().stats.births, 0);
  noBirth.dispose();

  const birth = new RapierSimulation(RAPIER, makeConfig({ birthProbability: 1, maxPopulation: 3 }), movingPair());
  step(birth, 12);
  assert.equal(birth.getSnapshot().stats.births, 1);
  assert.equal(birth.getSnapshot().stats.birthAttempts, 1);
  assert.equal(birth.getSnapshot().stats.currentCount, 3);
  assert.equal(birth.getSnapshot().ended, true);
  assert.equal(birth.getSnapshot().endReason, 'population-target');
  assert.equal(birth.getSnapshot().stats.missedBirths, 0);
  birth.dispose();
});

test('达到人口目标、只剩一球、没有球和手动结束都有不同结果', () => {
  const target = new RapierSimulation(RAPIER, makeConfig({ maxPopulation: 2 }), movingPair());
  assert.equal(target.getSnapshot().endReason, 'population-target');
  target.dispose();

  const single = new RapierSimulation(RAPIER, makeConfig({ gapCount: 1, gapWidthRatio: 3 }), [
    { position: { x: 0, y: -9.5 }, velocity: { x: 0, y: -24 } },
    { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } },
  ]);
  step(single, 40);
  assert.equal(single.getSnapshot().stats.currentCount, 1);
  assert.equal(single.getSnapshot().endReason, 'single-ball');
  single.dispose();

  const empty = new RapierSimulation(RAPIER, makeConfig({ gapCount: 1, gapWidthRatio: 3 }), [
    { position: { x: -0.28, y: -9.5 }, velocity: { x: 0, y: -24 } },
    { position: { x: 0.28, y: -9.5 }, velocity: { x: 0, y: -24 } },
  ]);
  step(empty, 12);
  assert.equal(empty.getSnapshot().stats.currentCount, 0);
  assert.equal(empty.getSnapshot().endReason, 'no-balls');
  empty.dispose();

  const manual = new RapierSimulation(RAPIER, makeConfig(), movingPair());
  manual.finishManually();
  assert.equal(manual.getSnapshot().ended, true);
  assert.equal(manual.getSnapshot().endReason, 'manual');
  simulationStepNoChange(manual);
  manual.dispose();
});

function simulationStepNoChange(simulation: RapierSimulation): void {
  const before = simulation.getSnapshot();
  simulation.step(FIXED_STEP_SECONDS);
  const after = simulation.getSnapshot();
  assert.deepEqual(after, before);
}

test('缺口离场会移除球并计数', () => {
  const seeds = [
    { position: { x: 0, y: -9.5 }, velocity: { x: 0, y: -8 } },
    { position: { x: 5, y: 0 }, velocity: { x: 0, y: 0 } },
  ];
  const simulation = new RapierSimulation(RAPIER, makeConfig({ gapCount: 1, gapWidthRatio: 3 }), seeds);
  step(simulation, 50);
  const snapshot = simulation.getSnapshot();
  assert.equal(snapshot.stats.currentCount, 1);
  assert.equal(snapshot.stats.exits, 1);
  assert.equal(snapshot.endReason, 'single-ball');
  simulation.dispose();
});

test('高密度 1000 球场景位置有限且穿透受限', () => {
  const count = 1000;
  const radius = ARENA_HALF_EXTENT * DEFAULT_CONFIG.ballDiameterRatio;
  const seeds = denseSeeds(count, radius);
  const config = makeConfig({ initialCount: 100, maxPopulation: 1000, gravity: 0, birthProbability: 0 });
  const simulation = new RapierSimulation(RAPIER, config, seeds, undefined, false);
  step(simulation, 1);
  const balls = simulation.getSnapshot().balls;
  let maximumOverlap = 0;

  for (let first = 0; first < balls.length; first += 1) {
    assert.ok(Number.isFinite(balls[first].x) && Number.isFinite(balls[first].y));
    for (let second = first + 1; second < balls.length; second += 1) {
      maximumOverlap = Math.max(maximumOverlap, balls[first].radius + balls[second].radius - distance(balls[first], balls[second]));
    }
  }
  assert.equal(balls.length, count);
  assert.ok(maximumOverlap <= 0.1, `maximum overlap ${maximumOverlap.toFixed(4)} exceeded 0.1`);
  assert.ok(Number.isFinite(simulation.getSnapshot().stats.maxSpeed));
  simulation.dispose();
});

test('无全局能量校正时，弹性重力场在数值误差范围内保持能量', () => {
  const seeds = [
    { position: { x: -4, y: -3 }, velocity: { x: 3, y: 0.3 } },
    { position: { x: 4, y: -3 }, velocity: { x: -3, y: -0.3 } },
  ];
  const config = makeConfig({ gravity: 1.5, initialCount: 2, maxPopulation: 10, restitution: 1 });
  const simulation = new RapierSimulation(RAPIER, config, seeds);
  const before = energyState(simulation, config.gravity);
  step(simulation, 720);
  const after = energyState(simulation, config.gravity);
  const relativeDrift = Math.abs(after.total - before.total) / Math.max(before.magnitude, 1);

  assert.ok(relativeDrift < 0.01, `elastic mechanical energy drift ${relativeDrift}`);
  simulation.dispose();
});
