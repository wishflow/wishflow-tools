import { CircleBatchSimulation } from '../src/physics/CircleBatchSimulation';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS, type SimulationConfig } from '../src/types';

const DURATION_SECONDS = Number(process.env.GROWTH_DIAGNOSTIC_SECONDS ?? 90);
const SEEDS = (process.env.GROWTH_DIAGNOSTIC_SEEDS ?? 'LAB-0012AB34,LAB-07A1298F,LAB-4D8C03F1').split(',').filter(Boolean);
const GRAVITY_LEVELS = [0, 2, 9.8];
const INITIAL_COUNT = Number(process.env.GROWTH_DIAGNOSTIC_INITIAL_COUNT ?? 100);
const BIRTH_PROBABILITY = Number(process.env.GROWTH_DIAGNOSTIC_BIRTH_PROBABILITY ?? 0.35);
const STALL_TARGET = Number(process.env.GROWTH_DIAGNOSTIC_STALL_TARGET ?? 780);
const STALL_COMPARISON_SECONDS = Number(process.env.GROWTH_DIAGNOSTIC_STALL_SECONDS ?? 20);

function bucketBalls(balls: Array<{ x: number; y: number }>, cellSize: number): Map<string, number> {
  const buckets = new Map<string, number>();
  for (const ball of balls) {
    const key = `${Math.floor(ball.x / cellSize)}:${Math.floor(ball.y / cellSize)}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return buckets;
}

function physicalState(simulation: CircleBatchSimulation, gravity: number): {
  energy: number;
  energyMagnitude: number;
  meanSpeed: number;
  maxSpeed: number;
} {
  const internals = simulation as unknown as {
    count: number;
    radius: number;
    x: Float64Array;
    y: Float64Array;
    vx: Float64Array;
    vy: Float64Array;
  };
  const mass = Math.PI * internals.radius ** 2;
  let energy = 0;
  let energyMagnitude = 0;
  let speedTotal = 0;
  let maxSpeed = 0;
  for (let index = 0; index < internals.count; index += 1) {
    const position = { x: internals.x[index], y: internals.y[index] };
    const velocity = { x: internals.vx[index], y: internals.vy[index] };
    const speed = Math.hypot(velocity.x, velocity.y);
    const kinetic = mass * (velocity.x ** 2 + velocity.y ** 2) / 2;
    const potential = -mass * gravity * position.y;
    energy += kinetic + potential;
    energyMagnitude += Math.abs(kinetic) + Math.abs(potential);
    speedTotal += speed;
    maxSpeed = Math.max(maxSpeed, speed);
  }
  return {
    energy,
    energyMagnitude,
    meanSpeed: speedTotal / Math.max(1, internals.count),
    maxSpeed,
  };
}

console.log(`CircleBatch fixed-population flow samples (${INITIAL_COUNT} balls, no births, same 20 s for each field)`);
console.log('seed      field      elapsed bottom-half lower-third occupied-cells max-cell max-speed');
console.log(`Growth samples (${INITIAL_COUNT} initial balls, p=${BIRTH_PROBABILITY}, run until target or ${DURATION_SECONDS} s)`);
console.log('seed      field      elapsed  count births attempts blocked-space blocked-energy exits bottom-half lower-third max-cell max-speed');

for (const seed of SEEDS) {
  for (const gravity of GRAVITY_LEVELS) {
    const config: SimulationConfig = {
      ...DEFAULT_CONFIG,
      seed,
      gravity,
      initialCount: INITIAL_COUNT,
      maxPopulation: 1000,
      birthProbability: BIRTH_PROBABILITY,
    };
    const flowSimulation = new CircleBatchSimulation({ ...config, birthProbability: 0 });
    for (let frame = 0; frame < 20 / FIXED_STEP_SECONDS; frame += 1) flowSimulation.step(FIXED_STEP_SECONDS);
    const flowSnapshot = flowSimulation.getSnapshot();
    const flowCells = bucketBalls(flowSnapshot.balls, 1.5);
    const flowBottomHalf = flowSnapshot.balls.filter((ball) => ball.y > 0).length;
    const flowLowerThird = flowSnapshot.balls.filter((ball) => ball.y > config.arenaSize / 6).length;
    console.log([
      seed.padEnd(9), `${gravity.toFixed(1)} m/s²`.padEnd(10), '20.0'.padStart(7),
      `${Math.round(flowBottomHalf / flowSnapshot.balls.length * 100)}%`.padStart(11),
      `${Math.round(flowLowerThird / flowSnapshot.balls.length * 100)}%`.padStart(11),
      String(flowCells.size).padStart(14),
      String(Math.max(0, ...flowCells.values())).padStart(8),
      flowSnapshot.stats.maxSpeed.toFixed(1).padStart(9),
    ].join(' '));
    flowSimulation.dispose();

    const simulation = new CircleBatchSimulation(config);
    const frameCount = Math.ceil(DURATION_SECONDS / FIXED_STEP_SECONDS);
    let lastGrowthAt = 0;
    let previousCount = INITIAL_COUNT;

    for (let frame = 0; frame < frameCount && !simulation.isEnded; frame += 1) {
      simulation.step(FIXED_STEP_SECONDS);
      const count = simulation.getSnapshot().stats.currentCount;
      if (count !== previousCount) {
        previousCount = count;
        lastGrowthAt = simulation.getSnapshot().stats.elapsedSeconds;
      }
    }

    const snapshot = simulation.getSnapshot();
    const halfExtent = config.arenaSize / 2;
    const gridSize = snapshot.balls.reduce((size, ball) => Math.max(size, ball.radius * 6), 0.1);
    const cells = bucketBalls(snapshot.balls, gridSize);
    const bottomHalf = snapshot.balls.filter((ball) => ball.y > 0).length;
    const lowerThird = snapshot.balls.filter((ball) => ball.y > halfExtent / 3).length;
    const stats = snapshot.stats;
    console.log([
      seed.padEnd(9),
      `${gravity.toFixed(1)} m/s²`.padEnd(10),
      stats.elapsedSeconds.toFixed(1).padStart(7),
      String(stats.currentCount).padStart(6),
      String(stats.births).padStart(6),
      String(stats.birthAttempts).padStart(8),
      String(stats.missedSpaceBirths).padStart(13),
      String(stats.missedEnergyBirths).padStart(14),
      String(stats.exits).padStart(5),
      `${Math.round((bottomHalf / Math.max(1, stats.currentCount)) * 100)}%`.padStart(11),
      `${Math.round((lowerThird / Math.max(1, stats.currentCount)) * 100)}%`.padStart(11),
      String(Math.max(0, ...cells.values())).padStart(8),
      stats.maxSpeed.toFixed(1).padStart(9),
      `no-growth ${Math.max(0, stats.elapsedSeconds - lastGrowthAt).toFixed(1)}s`,
    ].join(' '));
    simulation.dispose();
  }
}

const checkpointSeed = SEEDS[0];
if (checkpointSeed && INITIAL_COUNT < STALL_TARGET) {
  const config: SimulationConfig = {
    ...DEFAULT_CONFIG,
    seed: checkpointSeed,
    gravity: 2,
    initialCount: INITIAL_COUNT,
    maxPopulation: 1000,
    birthProbability: BIRTH_PROBABILITY,
  };
  const growth = new CircleBatchSimulation(config);
  for (let frame = 0; frame < DURATION_SECONDS / FIXED_STEP_SECONDS; frame += 1) {
    growth.step(FIXED_STEP_SECONDS);
    if (growth.getSnapshot().stats.currentCount >= STALL_TARGET || growth.isEnded) break;
  }

  const checkpoint = growth.getSnapshot();
  const internalGrowth = growth as unknown as {
    count: number;
    x: Float64Array;
    y: Float64Array;
    vx: Float64Array;
    vy: Float64Array;
  };
  const seeds = Array.from({ length: internalGrowth.count }, (_, index) => ({
    position: { x: internalGrowth.x[index], y: internalGrowth.y[index] },
    velocity: { x: internalGrowth.vx[index], y: internalGrowth.vy[index] },
  }));
  const checkpointStats = checkpoint.stats;
  console.log(`\nDense-growth checkpoint: seed=${checkpointSeed}, count=${checkpointStats.currentCount}, time=${checkpointStats.elapsedSeconds.toFixed(2)} s, blocked-space=${checkpointStats.missedSpaceBirths}, blocked-energy=${checkpointStats.missedEnergyBirths}`);
  growth.dispose();

  console.log(`Fixed-count continuation from that exact checkpoint (${STALL_COMPARISON_SECONDS} s, births disabled)`);
  console.log('field      count bottom-half lower-third mean-speed max-speed energy-drift');
  for (const gravity of GRAVITY_LEVELS) {
    const comparisonConfig: SimulationConfig = {
      ...config,
      gravity,
      initialCount: seeds.length,
      birthProbability: 0,
    };
    const comparison = new CircleBatchSimulation(comparisonConfig, seeds);
    const activeGravity = comparisonConfig.gravity;
    const before = physicalState(comparison, activeGravity);
    for (let frame = 0; frame < STALL_COMPARISON_SECONDS / FIXED_STEP_SECONDS; frame += 1) comparison.step(FIXED_STEP_SECONDS);
    const after = physicalState(comparison, activeGravity);
    const snapshot = comparison.getSnapshot();
    const bottomHalf = snapshot.balls.filter((ball) => ball.y > 0).length;
    const lowerThird = snapshot.balls.filter((ball) => ball.y > comparisonConfig.arenaSize / 6).length;
    console.log([
      `${gravity.toFixed(1)} m/s²`.padEnd(10),
      String(snapshot.stats.currentCount).padStart(5),
      `${Math.round(bottomHalf / Math.max(1, snapshot.stats.currentCount) * 100)}%`.padStart(11),
      `${Math.round(lowerThird / Math.max(1, snapshot.stats.currentCount) * 100)}%`.padStart(10),
      after.meanSpeed.toFixed(2).padStart(11),
      after.maxSpeed.toFixed(2).padStart(9),
      `${((after.energy - before.energy) / Math.max(before.energyMagnitude, 1) * 100).toFixed(5)}%`.padStart(13),
    ].join(' '));
    comparison.dispose();
  }
}
