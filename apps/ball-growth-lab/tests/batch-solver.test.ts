import assert from 'node:assert/strict';
import test from 'node:test';
import { CircleBatchSimulation } from '../src/physics/CircleBatchSimulation';
import { PairCooldown } from '../src/physics/PairCooldown';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS, type Point, type SimulationConfig, type SpawnSeed } from '../src/types';

interface BatchInternals {
  count: number;
  x: Float64Array;
  y: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
  radius: number;
}

function internals(simulation: CircleBatchSimulation): BatchInternals {
  return simulation as unknown as BatchInternals;
}

function makeConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    ...DEFAULT_CONFIG,
    shape: 'circle',
    arenaSize: 20,
    gapCount: 0,
    ballDiameterRatio: 0.024,
    gapWidthRatio: 2,
    gravity: 0,
    restitution: 1,
    initialSpeed: 11,
    speedSpread: 0.3,
    initialDirection: 270,
    directionSpread: 120,
    initialCount: 2,
    birthProbability: 0,
    pairCooldown: 0.5,
    maxPopulation: 10,
    seed: 'BATCH-TEST',
    ...overrides,
  };
}

function step(simulation: CircleBatchSimulation, count: number): void {
  for (let index = 0; index < count && !simulation.isEnded; index += 1) simulation.step(FIXED_STEP_SECONDS);
}

function movingPair(speed = 1.5, offset = 0.29): SpawnSeed[] {
  return [
    { position: { x: -offset, y: 0 }, velocity: { x: speed, y: 0 } },
    { position: { x: offset, y: 0 }, velocity: { x: -speed, y: 0 } },
  ];
}

function kineticEnergy(simulation: CircleBatchSimulation): number {
  const state = internals(simulation);
  let energy = 0;
  for (let index = 0; index < state.count; index += 1) {
    energy += (state.vx[index] ** 2 + state.vy[index] ** 2) / 2;
  }
  return energy;
}

function velocities(simulation: CircleBatchSimulation): Point[] {
  const state = internals(simulation);
  return Array.from({ length: state.count }, (_, index) => ({ x: state.vx[index], y: state.vy[index] }));
}

function totalMomentum(simulation: CircleBatchSimulation): Point {
  return velocities(simulation).reduce((total, velocity) => ({
    x: total.x + velocity.x,
    y: total.y + velocity.y,
  }), { x: 0, y: 0 });
}

test('批量求解器按固定种子生成互不重叠的高位初始球', () => {
  const config = makeConfig({ initialCount: 24, maxPopulation: 30 });
  const first = new CircleBatchSimulation(config);
  const second = new CircleBatchSimulation(config);
  const firstBalls = first.getSnapshot().balls;
  const secondBalls = second.getSnapshot().balls;
  assert.deepEqual(firstBalls.map(({ x, y }) => [x, y]), secondBalls.map(({ x, y }) => [x, y]));
  assert.ok(firstBalls.every((ball) => ball.y < 0), 'balls should start in the upper half');

  for (let firstIndex = 0; firstIndex < firstBalls.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < firstBalls.length; secondIndex += 1) {
      const dx = firstBalls[firstIndex].x - firstBalls[secondIndex].x;
      const dy = firstBalls[firstIndex].y - secondBalls[secondIndex].y;
      assert.ok(Math.hypot(dx, dy) >= firstBalls[firstIndex].radius * 2 - 1e-6);
    }
  }
  first.dispose();
  second.dispose();
});

test('初始速度大小和方向使用配置值', () => {
  const simulation = new CircleBatchSimulation(makeConfig({
    initialSpeed: 7,
    speedSpread: 0,
    initialDirection: 180,
    directionSpread: 0,
  }));
  for (const velocity of velocities(simulation)) {
    assert.ok(Math.abs(Math.hypot(velocity.x, velocity.y) - 7) < 1e-10);
    assert.ok(velocity.x < -6.99);
    assert.ok(Math.abs(velocity.y) < 1e-10);
  }
  simulation.dispose();
});

test('弹性正碰交换运动方向并保持动能', () => {
  const simulation = new CircleBatchSimulation(makeConfig(), movingPair());
  const before = kineticEnergy(simulation);
  step(simulation, 30);
  const balls = simulation.getSnapshot().balls;
  assert.ok(balls[0].x < 0, `expected first ball to rebound left, got ${balls[0].x}`);
  assert.ok(balls[1].x > 0, `expected second ball to rebound right, got ${balls[1].x}`);
  assert.ok(Math.abs(kineticEnergy(simulation) - before) < 1e-9);
  simulation.dispose();
});

test('弹性斜碰前后保持总动量和动能', () => {
  const seeds: SpawnSeed[] = [
    { position: { x: -0.3, y: -0.03 }, velocity: { x: 2, y: 0.8 } },
    { position: { x: 0.3, y: 0.03 }, velocity: { x: -1, y: -0.4 } },
  ];
  const simulation = new CircleBatchSimulation(makeConfig(), seeds);
  const beforeEnergy = kineticEnergy(simulation);
  const beforeMomentum = totalMomentum(simulation);
  step(simulation, 40);
  const afterMomentum = totalMomentum(simulation);
  assert.ok(Math.abs(kineticEnergy(simulation) - beforeEnergy) < 1e-9);
  assert.ok(Math.abs(afterMomentum.x - beforeMomentum.x) < 1e-9);
  assert.ok(Math.abs(afterMomentum.y - beforeMomentum.y) < 1e-9);
  simulation.dispose();
});

test('非弹性恢复系数降低碰撞后的相对速度', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ restitution: 0.5 }), movingPair());
  step(simulation, 30);
  const result = velocities(simulation);
  assert.ok(result[0].x < 0 && result[1].x > 0);
  assert.ok(Math.abs(result[0].x) < 1.5 && Math.abs(result[1].x) < 1.5);
  simulation.dispose();
});

test('高速度碰撞使用自适应内步，避免两球穿过彼此', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ initialSpeed: 0 }), [
    { position: { x: -0.55, y: 0 }, velocity: { x: 120, y: 0 } },
    { position: { x: 0.55, y: 0 }, velocity: { x: -120, y: 0 } },
  ]);
  simulation.step(FIXED_STEP_SECONDS);
  const state = velocities(simulation);
  assert.ok(state[0].x < 0 && state[1].x > 0, `expected high-speed rebound, got ${state.map((value) => value.x)}`);
  assert.ok(state.every((value) => Number.isFinite(value.x) && Number.isFinite(value.y)));
  assert.ok(Math.abs(Math.hypot(state[0].x, state[0].y) - 120) < 1e-8);
  simulation.dispose();
});

test('高速度圆形边界反弹保持速率', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ initialSpeed: 0 }), [
    { position: { x: 9.6, y: 0 }, velocity: { x: 120, y: 0 } },
    { position: { x: 0, y: 5 }, velocity: { x: 0, y: 0 } },
  ]);
  simulation.step(FIXED_STEP_SECONDS);
  const snapshot = simulation.getSnapshot();
  const state = velocities(simulation);
  assert.ok(state[0].x < 0);
  assert.ok(Math.abs(Math.hypot(state[0].x, state[0].y) - 120) < 1e-8);
  assert.ok(snapshot.balls[0].x < 9.76);
  simulation.dispose();
});

test('可调重力使速度按固定步长改变', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ gravity: 12 }), [
    { position: { x: -2, y: 0 }, velocity: { x: 0, y: 3 } },
    { position: { x: 2, y: 0 }, velocity: { x: 0, y: 0 } },
  ]);
  simulation.step(FIXED_STEP_SECONDS);
  const state = velocities(simulation);
  assert.ok(Math.abs(state[0].y - (3 + 12 * FIXED_STEP_SECONDS)) < 1e-10);
  assert.ok(Math.abs(state[1].y - 12 * FIXED_STEP_SECONDS) < 1e-10);
  simulation.dispose();
});

test('非默认场地尺寸用于位置、边界反弹和离场判断', () => {
  const config = makeConfig({ arenaSize: 16, initialSpeed: 0 });
  const simulation = new CircleBatchSimulation(config, [
    { position: { x: 7.65, y: 0 }, velocity: { x: 80, y: 0 } },
    { position: { x: 0, y: 3 }, velocity: { x: 0, y: 0 } },
  ]);
  simulation.step(FIXED_STEP_SECONDS);
  const snapshot = simulation.getSnapshot();
  assert.equal(snapshot.stats.currentCount, 2);
  assert.ok(snapshot.balls[0].x < 7.82);
  assert.ok(velocities(simulation)[0].x < 0);
  simulation.dispose();
});

test('有顶部缺口时在缺口内侧生成带配置初速度的球', () => {
  const simulation = new CircleBatchSimulation(makeConfig({
    gapCount: 2,
    initialCount: 4,
    initialSpeed: 5,
    speedSpread: 0,
    initialDirection: 270,
    directionSpread: 0,
  }));
  const snapshot = simulation.getSnapshot();
  assert.equal(snapshot.balls.length, 4);
  assert.ok(snapshot.balls[0].y < -9.7);
  assert.ok(snapshot.balls.every((ball) => ball.y < 0 && Math.hypot(ball.x, ball.y) < 10));
  assert.ok(velocities(simulation).every((velocity) => Math.abs(velocity.y + 5) < 1e-10));
  simulation.dispose();
});

test('碰撞出生一次并达到人口目标后结束', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ birthProbability: 1, maxPopulation: 3 }), movingPair());
  step(simulation, 12);
  const snapshot = simulation.getSnapshot();
  assert.equal(snapshot.stats.births, 1);
  assert.equal(snapshot.stats.birthAttempts, 1);
  assert.equal(snapshot.stats.currentCount, 3);
  assert.equal(snapshot.ended, true);
  assert.equal(snapshot.endReason, 'population-target');
  simulation.dispose();
});

test('繁殖概率为 0 时仍弹开碰撞但不会生成球', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ birthProbability: 0 }), movingPair());
  step(simulation, 30);
  const snapshot = simulation.getSnapshot();
  assert.equal(snapshot.stats.currentCount, 2);
  assert.equal(snapshot.stats.births, 0);
  assert.equal(snapshot.stats.birthAttempts, 0);
  assert.equal(snapshot.endReason, null);
  simulation.dispose();
});

test('繁殖只改变人口，父球碰后速度与关闭繁殖时一致', () => {
  const seeds: SpawnSeed[] = [
    { position: { x: -0.29, y: 0 }, velocity: { x: 2, y: 0.2 } },
    { position: { x: 0.29, y: 0 }, velocity: { x: -1, y: -0.1 } },
  ];
  const withoutBirth = new CircleBatchSimulation(makeConfig({ birthProbability: 0 }), seeds);
  const withBirth = new CircleBatchSimulation(makeConfig({ birthProbability: 1, maxPopulation: 3 }), seeds);
  for (let frame = 0; frame < 100 && withBirth.getSnapshot().stats.births === 0; frame += 1) {
    withoutBirth.step(FIXED_STEP_SECONDS);
    withBirth.step(FIXED_STEP_SECONDS);
  }

  assert.equal(withBirth.getSnapshot().stats.births, 1);
  const controlVelocities = velocities(withoutBirth);
  const bornVelocities = velocities(withBirth);
  assert.deepEqual(bornVelocities.slice(0, 2), controlVelocities);
  const childVelocity = bornVelocities[2];
  const childSpeed = Math.hypot(childVelocity.x, childVelocity.y);
  const parentSpeeds = bornVelocities.slice(0, 2).map((velocity) => Math.hypot(velocity.x, velocity.y));
  assert.ok(childSpeed >= Math.min(...parentSpeeds) - 1e-10);
  assert.ok(childSpeed <= Math.max(...parentSpeeds) + 1e-10);

  const stats = withBirth.getSnapshot().stats;
  assert.ok(Math.abs(stats.birthKineticEnergyAdded - childSpeed ** 2 / 2) < 1e-10);
  assert.ok(Math.abs(stats.birthMomentumAdded.x - childVelocity.x) < 1e-10);
  assert.ok(Math.abs(stats.birthMomentumAdded.y - childVelocity.y) < 1e-10);
  withoutBirth.dispose();
  withBirth.dispose();
});

test('静止重叠和分离接触不会触发繁殖判定', () => {
  for (const [firstVelocity, secondVelocity] of [
    [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    [{ x: -1, y: 0 }, { x: 1, y: 0 }],
  ] as const) {
    const simulation = new CircleBatchSimulation(makeConfig({ birthProbability: 1 }), [
      { position: { x: -0.225, y: 0 }, velocity: firstVelocity },
      { position: { x: 0.225, y: 0 }, velocity: secondVelocity },
    ]);
    simulation.step(FIXED_STEP_SECONDS);
    assert.equal(simulation.getSnapshot().stats.birthAttempts, 0);
    assert.equal(simulation.getSnapshot().stats.births, 0);
    simulation.dispose();
  }
});

test('父球碰后完全静止时子球也没有隐藏速度下限', () => {
  const simulation = new CircleBatchSimulation(makeConfig({
    birthProbability: 1,
    restitution: 0,
    maxPopulation: 3,
  }), movingPair(1.5));
  step(simulation, 12);
  const state = velocities(simulation);
  const childVelocity = state[2];
  assert.equal(simulation.getSnapshot().stats.births, 1);
  assert.equal(Math.hypot(state[0].x, state[0].y), 0);
  assert.equal(Math.hypot(state[1].x, state[1].y), 0);
  assert.equal(Math.hypot(childVelocity.x, childVelocity.y), 0);
  simulation.dispose();
});

test('正重力下出生方向始终落在朝上 270° ± 45° 范围', () => {
  const simulation = new CircleBatchSimulation(makeConfig({
    gravity: 9.8,
    birthProbability: 1,
    maxPopulation: 3,
  }), movingPair());
  step(simulation, 100);
  const snapshot = simulation.getSnapshot();
  const childVelocity = velocities(simulation)[2];
  assert.equal(snapshot.stats.births, 1);
  const angle = (Math.atan2(childVelocity.y, childVelocity.x) * 180 / Math.PI + 360) % 360;
  assert.ok(childVelocity.y < 0);
  assert.ok(angle >= 225 - 1e-10 && angle <= 315 + 1e-10, `unexpected upward-cone angle ${angle}`);
  simulation.dispose();
});

test('一帧内求解器多次检测同一碰撞只记录一次尝试', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ birthProbability: 0.5, maxPopulation: 10 }), [
    { position: { x: -0.23, y: 0 }, velocity: { x: 0.1, y: 0 } },
    { position: { x: 0.23, y: 0 }, velocity: { x: -0.1, y: 0 } },
  ]);
  simulation.step(FIXED_STEP_SECONDS);
  const stats = simulation.getSnapshot().stats;
  assert.equal(stats.birthAttempts, 1);
  simulation.dispose();
});

test('碰撞对在冷却时间内不接受新繁殖判定', () => {
  const cooldown = new PairCooldown();
  assert.equal(cooldown.shouldAccept(4, 9, 1, 0.7), true);
  assert.equal(cooldown.shouldAccept(9, 4, 1.6, 0.7), false);
  assert.equal(cooldown.shouldAccept(4, 9, 1.7, 0.7), true);
});

test('穿过底部缺口的球会移除、计数并以空场结束', () => {
  const simulation = new CircleBatchSimulation(
    makeConfig({ arenaSize: 24, gapCount: 2, gapWidthRatio: 2, gravity: 9.8 }),
    [
      { position: { x: 0, y: 11.5 }, velocity: { x: 0, y: 0 } },
      { position: { x: 3, y: 0 }, velocity: { x: 0, y: 0 } },
    ],
  );
  step(simulation, 2000);
  const snapshot = simulation.getSnapshot();
  assert.equal(snapshot.stats.currentCount, 1);
  assert.equal(snapshot.stats.exits, 1);
  assert.equal(snapshot.endReason, 'single-ball');
  simulation.dispose();
});

test('没有缺口时边界反弹不会计为离场', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ initialSpeed: 0 }), [
    { position: { x: 9.6, y: 0 }, velocity: { x: 10, y: 0 } },
    { position: { x: 0, y: 4 }, velocity: { x: 0, y: 0 } },
  ]);
  step(simulation, 60);
  assert.equal(simulation.getSnapshot().stats.exits, 0);
  assert.equal(simulation.getSnapshot().stats.currentCount, 2);
  simulation.dispose();
});

test('人口上限、单球、空场和手动结束分别产生正确原因', () => {
  const target = new CircleBatchSimulation(makeConfig({ maxPopulation: 2 }));
  assert.equal(target.getSnapshot().endReason, 'population-target');
  target.dispose();

  const single = new CircleBatchSimulation(makeConfig(), [
    { position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 } },
  ]);
  assert.equal(single.getSnapshot().endReason, 'single-ball');
  single.dispose();

  const empty = new CircleBatchSimulation(makeConfig({ gapCount: 2 }), []);
  assert.equal(empty.getSnapshot().endReason, 'no-balls');
  empty.dispose();

  const manual = new CircleBatchSimulation(makeConfig());
  manual.finishManually();
  const before = manual.getSnapshot();
  step(manual, 10);
  assert.equal(before.endReason, 'manual');
  assert.equal(manual.getSnapshot().stats.elapsedSeconds, before.stats.elapsedSeconds);
  manual.dispose();
});

test('连续运动保持数值有限且球速不会无故累积', () => {
  const simulation = new CircleBatchSimulation(makeConfig({ gravity: 0 }), [
    { position: { x: -0.29, y: 0 }, velocity: { x: 1.5, y: 0 } },
    { position: { x: 0.29, y: 0 }, velocity: { x: -1.5, y: 0 } },
  ]);
  const initialSpeed = 1.5;
  step(simulation, 5000);
  const snapshot = simulation.getSnapshot();
  assert.ok(snapshot.balls.every((ball) => Number.isFinite(ball.x) && Number.isFinite(ball.y)));
  assert.ok(Number.isFinite(snapshot.stats.maxSpeed));
  assert.ok(snapshot.stats.maxSpeed <= initialSpeed + 1e-8);
  simulation.dispose();
});

test('同一配置和种子可复现繁殖运行', () => {
  const config = makeConfig({ initialCount: 12, maxPopulation: 40, birthProbability: 0.35 });
  const first = new CircleBatchSimulation(config);
  const second = new CircleBatchSimulation(config);
  step(first, 240);
  step(second, 240);
  const firstSnapshot = first.getSnapshot();
  const secondSnapshot = second.getSnapshot();
  assert.deepEqual(firstSnapshot.balls, secondSnapshot.balls);
  assert.deepEqual(firstSnapshot.stats, secondSnapshot.stats);
  first.dispose();
  second.dispose();
});
