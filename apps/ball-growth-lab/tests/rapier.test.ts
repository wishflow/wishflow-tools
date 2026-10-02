import assert from 'node:assert/strict';
import test from 'node:test';
import * as RAPIER from '@dimforge/rapier2d-compat';
import { initializeRapier, RapierSimulation } from '../src/physics/RapierSimulation';
import { ARENA_HALF_EXTENT, DEFAULT_CONFIG, FIXED_STEP_SECONDS, type ArenaShape, type Point, type SimulationConfig, type SpawnSeed } from '../src/types';

await initializeRapier(RAPIER);

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    ...DEFAULT_CONFIG,
    motionField: 'gravity',
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

function denseSeeds(count: number, shape: ArenaShape, radius: number): SpawnSeed[] {
  const points: Point[] = [];
  const spacing = radius * 2.05;
  const rowSpacing = spacing * Math.sqrt(3) / 2;
  const limit = ARENA_HALF_EXTENT - radius - 0.15;
  const rows = Math.ceil(limit / rowSpacing);
  const columns = Math.ceil(limit / spacing);

  for (let row = -rows; row <= rows; row += 1) {
    for (let column = -columns; column <= columns; column += 1) {
      const point = { x: column * spacing + (Math.abs(row) % 2) * spacing / 2, y: row * rowSpacing };
      if (shape === 'circle' ? Math.hypot(point.x, point.y) > limit : Math.abs(point.x) > limit || Math.abs(point.y) > limit) continue;
      points.push(point);
    }
  }

  if (points.length < count) throw new Error(`场地无法放置 ${count} 个性能回归球。`);
  return Array.from({ length: count }, (_, index) => ({
    position: points[Math.floor(((index + 0.5) / count) * points.length)],
    velocity: { x: 0, y: 0 },
  }));
}

test('Rapier 固定种子可复现，初始随机球位于上半场且不会重叠', () => {
  const config = makeConfig({ initialCount: 24, maxPopulation: 24, seed: 'RAPIER-PACK-TEST' });
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

test('发射速度、方向和随机扩散会实际控制初速度', () => {
  const config = makeConfig({
    gravity: 0,
    initialSpeed: 4,
    speedSpread: 0,
    initialDirection: 90,
    directionSpread: 0,
  });
  const simulation = new RapierSimulation(RAPIER, config);
  const velocities = physicsBodies(simulation).map((body) => body.linvel());

  assert.equal(velocities.length, config.initialCount);
  for (const velocity of velocities) {
    assert.ok(Math.abs(velocity.x) < 1e-5);
    assert.ok(Math.abs(velocity.y - 4) < 1e-5);
  }
  simulation.dispose();
});

test('无重力弯曲场持续转向且不改变自由飞行速度', () => {
  const simulation = new RapierSimulation(RAPIER, makeConfig({
    motionField: 'curvature',
    gravity: 12,
    curvatureRate: 1.2,
  }), [{ position: { x: 0, y: 0 }, velocity: { x: 4, y: 0 } }]);
  step(simulation, 240);
  const [ball] = simulation.getSnapshot().balls;
  const velocity = physicsBodies(simulation)[0].linvel();

  assert.ok(ball.x > 2.5 && ball.y > 1, `expected a curved path, got (${ball.x}, ${ball.y})`);
  assert.ok(Math.abs(Math.hypot(velocity.x, velocity.y) - 4) < 0.02);
  simulation.dispose();
});

test('Rapier 弹性圆球碰撞后反向运动', () => {
  const simulation = new RapierSimulation(RAPIER, makeConfig(), movingPair());
  step(simulation, 30);
  const [first, second] = simulation.getSnapshot().balls;

  assert.ok(first.x < 0, `expected first ball to rebound left, got ${first.x}`);
  assert.ok(second.x > 0, `expected second ball to rebound right, got ${second.x}`);
  simulation.dispose();
});

test('高速球在自适应子步下不会互相穿透或穿过', () => {
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

  for (const shape of ['square', 'circle'] as const) {
    const boundarySimulation = new RapierSimulation(RAPIER, makeConfig({ shape }), [
      { position: { x: 9.5, y: 0 }, velocity: { x: 180, y: 0 } },
    ]);
    step(boundarySimulation, 1);
    const [ball] = boundarySimulation.getSnapshot().balls;

    assert.ok(ball.x < 9.5, `${shape} wall should rebound a fast ball, got x=${ball.x}`);
    boundarySimulation.dispose();
  }
});

test('Rapier 正方形和圆形边界都能弹回球体', () => {
  for (const shape of ['square', 'circle'] as const) {
    const simulation = new RapierSimulation(RAPIER, makeConfig({ shape }), [
      { position: { x: 9.4, y: 0 }, velocity: { x: 3, y: 0 } },
    ]);
    step(simulation, 120);
    const [ball] = simulation.getSnapshot().balls;

    assert.ok(ball.x < 9.4, `${shape} arena should rebound the ball inward, got x=${ball.x}`);
    simulation.dispose();
  }
});

test('Rapier 首次接触按概率繁殖，并遵守人口上限', () => {
  const noBirth = new RapierSimulation(RAPIER, makeConfig({ birthProbability: 0 }), movingPair());
  step(noBirth, 12);
  assert.equal(noBirth.getSnapshot().stats.births, 0);
  noBirth.dispose();

  const birth = new RapierSimulation(RAPIER, makeConfig({ birthProbability: 1, maxPopulation: 3 }), movingPair());
  const initialKineticEnergy = physicsBodies(birth).reduce((total, body) => {
    const velocity = body.linvel();
    return total + (velocity.x ** 2 + velocity.y ** 2) / 2;
  }, 0);
  step(birth, 12);
  assert.equal(birth.getSnapshot().stats.births, 1);
  assert.equal(birth.getSnapshot().stats.birthAttempts, 1);
  assert.equal(birth.getSnapshot().stats.currentCount, 3);
  assert.equal(birth.getSnapshot().ended, true);
  assert.equal(birth.getSnapshot().stats.missedBirths, 0);
  assert.equal(birth.getSnapshot().stats.missedSpaceBirths, 0);
  assert.equal(birth.getSnapshot().stats.missedEnergyBirths, 0);
  const finalKineticEnergy = physicsBodies(birth).reduce((total, body) => {
    const velocity = body.linvel();
    return total + (velocity.x ** 2 + velocity.y ** 2) / 2;
  }, 0);
  assert.ok(Math.abs(finalKineticEnergy - initialKineticEnergy) < 0.1);
  birth.dispose();

  const capped = new RapierSimulation(RAPIER, makeConfig({ birthProbability: 1, maxPopulation: 2 }), movingPair());
  step(capped, 12);
  assert.equal(capped.getSnapshot().stats.currentCount, 2);
  assert.equal(capped.getSnapshot().ended, true);
  assert.equal(capped.getSnapshot().stats.missedBirths, 0);
  capped.dispose();
});

test('Rapier 球穿过底部缺口后离场并计数', () => {
  const seeds = [{ position: { x: 0, y: 9.5 }, velocity: { x: 0, y: 8 } }];
  const simulation = new RapierSimulation(RAPIER, makeConfig({ gapCount: 2, gapWidthRatio: 2 }), seeds);
  step(simulation, 30);
  const stats = simulation.getSnapshot().stats;

  assert.equal(stats.currentCount, 0);
  assert.equal(stats.exits, 1);
  simulation.dispose();
});

test('Rapier 1000 球堆叠的最大穿透受限', () => {
  const shapes: ArenaShape[] = ['square', 'circle'];
  for (const shape of shapes) {
    const config = makeConfig({
      shape,
      gravity: 9.8,
      restitution: 0.9,
      initialCount: 1000,
      maxPopulation: 1000,
      birthProbability: 0,
    });
    const radius = ARENA_HALF_EXTENT * config.ballDiameterRatio;
    const simulation = new RapierSimulation(RAPIER, config, denseSeeds(1000, shape, radius));
    const initialEnergy = energyState(simulation, config.gravity);
    step(simulation, 960);
    const balls = simulation.getSnapshot().balls;
    const finalEnergy = energyState(simulation, config.gravity);
    let maximumOverlap = 0;

    for (let first = 0; first < balls.length; first += 1) {
      for (let second = first + 1; second < balls.length; second += 1) {
        maximumOverlap = Math.max(maximumOverlap, balls[first].radius + balls[second].radius - distance(balls[first], balls[second]));
      }
    }

    assert.equal(balls.length, 1000);
    assert.ok(maximumOverlap <= 0.1, `${shape} arena maximum overlap ${maximumOverlap.toFixed(4)} exceeded 0.1`);
    assert.ok(
      Math.abs(finalEnergy.total - initialEnergy.total) / Math.max(initialEnergy.magnitude, 1) < 1e-5,
      `${shape} arena energy drift exceeded correction tolerance`,
    );
    simulation.dispose();
  }
});

test('Rapier 在高密度同步落地时保持运动并校正刚体求解器的能量漂移', () => {
  const count = 20;
  const radius = ARENA_HALF_EXTENT * DEFAULT_CONFIG.ballDiameterRatio;
  const seeds = Array.from({ length: count }, (_, index) => ({
    position: { x: ((index % 5) - 2) * radius * 2.17, y: -8.8 + Math.floor(index / 5) * radius * 2.17 },
    velocity: { x: 0, y: 0 },
  }));
  const config = makeConfig({ gravity: 9.8, initialCount: count, maxPopulation: 100 });
  const simulation = new RapierSimulation(RAPIER, config, seeds);
  const bodies = physicsBodies(simulation);
  const initialEnergy = energyState(simulation, config.gravity);

  step(simulation, 2400);

  const finalEnergy = energyState(simulation, config.gravity);
  assert.ok(Math.abs(finalEnergy.total - initialEnergy.total) / Math.max(initialEnergy.magnitude, 1) < 1e-5);
  assert.ok(bodies.every((body) => !body.isSleeping()));
  assert.ok(bodies.filter((body) => Math.hypot(body.linvel().x, body.linvel().y) > 0.1).length >= 15);
  simulation.dispose();
});
