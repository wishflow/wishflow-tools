import { performance } from 'node:perf_hooks';
import * as RapierBenchmark from '@dimforge/rapier2d-compat';
import { CircleBatchSimulation } from './experimental/CircleBatchSimulation';
import { PlanckSimulation } from './experimental/PlanckSimulation';
import { initializeRapier, RapierSimulation } from '../src/physics/RapierSimulation';
import type { SolverTuning } from '../src/physics/PhysicsAdapter';
import { ARENA_HALF_EXTENT, DEFAULT_CONFIG, FIXED_STEP_SECONDS, type MotionField, type Point, type SimulationConfig, type SpawnSeed } from '../src/types';

const COUNTS = (process.env.BENCHMARK_COUNTS ?? '100,500,1000').split(',').map(Number).filter(Number.isFinite);
const SHAPES = (process.env.BENCHMARK_SHAPES ?? 'square,circle').split(',').filter((shape): shape is 'square' | 'circle' => shape === 'square' || shape === 'circle');
const ALGORITHMS = (process.env.BENCHMARK_ALGORITHMS ?? 'planck,circle-batch,rapier').split(',').filter((algorithm): algorithm is 'planck' | 'circle-batch' | 'rapier' => algorithm === 'planck' || algorithm === 'circle-batch' || algorithm === 'rapier');
const TUNINGS: SolverTuning[] = (process.env.BENCHMARK_TUNINGS ?? '6/2')
  .split(',')
  .map((value) => value.split('/').map(Number))
  .filter((parts) => (parts.length === 2 || parts.length === 3) && parts.every((part) => Number.isFinite(part) && part > 0))
  .map((parts) => ({ velocityIterations: parts[0], positionIterations: parts[1], allowedLinearError: parts[2] }));
const BENCHMARK_FRAMES = Number(process.env.BENCHMARK_FRAMES ?? 300);
const WARMUP_FRAMES = Number(process.env.WARMUP_FRAMES ?? 60);
const BALL_DIAMETER_RATIO = Number(process.env.BENCHMARK_BALL_DIAMETER_RATIO ?? DEFAULT_CONFIG.ballDiameterRatio);
const MOTION_FIELD: MotionField = process.env.BENCHMARK_MOTION_FIELD === 'curvature' ? 'curvature' : 'gravity';
const INITIAL_SPEED = Number(process.env.BENCHMARK_INITIAL_SPEED ?? 0);
const BIRTH_PROBABILITY = Number(process.env.BENCHMARK_BIRTH_PROBABILITY ?? 0);
const PAIR_COOLDOWN = Number(process.env.BENCHMARK_PAIR_COOLDOWN ?? DEFAULT_CONFIG.pairCooldown);

if (MOTION_FIELD === 'curvature' && ALGORITHMS.some((algorithm) => algorithm !== 'rapier')) {
  throw new Error('曲率场只在生产用的 Rapier 适配器中实现；请将 BENCHMARK_ALGORITHMS 设为 rapier。');
}

if (ALGORITHMS.includes('rapier')) await initializeRapier(RapierBenchmark);

function createGridSeeds(count: number, shape: SimulationConfig['shape'], radius: number, speed: number): SpawnSeed[] {
  const points: Point[] = [];
  const spacing = radius * 2.05;
  const rowSpacing = spacing * Math.sqrt(3) / 2;
  const limit = ARENA_HALF_EXTENT - radius - 0.15;
  const rows = Math.ceil(limit / rowSpacing);
  const columns = Math.ceil(limit / spacing);

  for (let row = -rows; row <= rows; row += 1) {
    for (let column = -columns; column <= columns; column += 1) {
      const point: Point = { x: column * spacing + (Math.abs(row) % 2) * spacing / 2, y: row * rowSpacing };
      if (shape === 'circle' ? Math.hypot(point.x, point.y) > limit : Math.abs(point.x) > limit || Math.abs(point.y) > limit) continue;
      points.push(point);
    }
  }
  if (points.length < count) throw new Error(`Benchmark layout only fit ${points.length} of ${count} balls at diameter ratio ${BALL_DIAMETER_RATIO}.`);
  return Array.from({ length: count }, (_, index) => ({
    position: points[Math.floor(((index + 0.5) / count) * points.length)],
    velocity: {
      x: speed * Math.cos(index * Math.PI * (3 - Math.sqrt(5))),
      y: speed * Math.sin(index * Math.PI * (3 - Math.sqrt(5))),
    },
  }));
}

function percentile(sorted: number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function maxPairOverlap(balls: Array<{ id: number; x: number; y: number; radius: number }>): { overlap: number; pair: string; position: string } {
  let overlap = 0;
  let pair = '-';
  let position = '-';
  for (let first = 0; first < balls.length; first += 1) {
    for (let second = first + 1; second < balls.length; second += 1) {
      const dx = balls[first].x - balls[second].x;
      const dy = balls[first].y - balls[second].y;
      const candidate = balls[first].radius + balls[second].radius - Math.hypot(dx, dy);
      if (candidate > overlap) {
        overlap = candidate;
        pair = `${balls[first].id}:${balls[second].id}`;
        position = `${balls[first].x.toFixed(2)},${balls[first].y.toFixed(2)} / ${balls[second].x.toFixed(2)},${balls[second].y.toFixed(2)}`;
      }
    }
  }
  return { overlap, pair, position };
}

console.log(`Fixed-step physics benchmark · diameter ratio ${BALL_DIAMETER_RATIO} · one local run · browser GPU/rendering excluded`);
console.log(`motion field ${MOTION_FIELD} · initial speed ${INITIAL_SPEED} m/s · birth probability ${BIRTH_PROBABILITY} · pair cooldown ${PAIR_COOLDOWN}s`);
console.log('start  arena   algorithm     solver  avg ms/step   p95 ms/step  steps/s  end  births  missed  seed overlap  max overlap  pairs >0.01  worst IDs and positions');

for (const count of COUNTS) {
  for (const shape of SHAPES) {
    for (const algorithm of ALGORITHMS) {
    for (const tuning of TUNINGS) {
    const ballDiameterRatio = BALL_DIAMETER_RATIO;
    const radius = ARENA_HALF_EXTENT * ballDiameterRatio;
    const config: SimulationConfig = {
      shape,
      arenaSize: ARENA_HALF_EXTENT * 2,
      gapCount: 0,
      ballDiameterRatio,
      gapWidthRatio: 2,
      motionField: MOTION_FIELD,
      gravity: 9.8,
      curvatureRate: 1.1,
      restitution: 1,
      initialSpeed: 11,
      speedSpread: 0.3,
      initialDirection: 270,
      directionSpread: 120,
      initialCount: Math.min(count, 100),
      birthProbability: BIRTH_PROBABILITY,
      pairCooldown: PAIR_COOLDOWN,
      maxPopulation: 1000,
      seed: `BENCH-${count}-${shape}`,
    };
    const seeds = createGridSeeds(count, shape, radius, INITIAL_SPEED);
    const seedOverlap = maxPairOverlap(seeds.map((seed, index) => ({
      id: index + 1,
      x: seed.position.x,
      y: seed.position.y,
      radius,
    })));
    const simulation = algorithm === 'planck'
      ? new PlanckSimulation(config, seeds, tuning)
      : algorithm === 'rapier'
        ? new RapierSimulation(RapierBenchmark, config, seeds, tuning)
        : new CircleBatchSimulation(config, seeds, tuning);

    for (let index = 0; index < WARMUP_FRAMES; index += 1) simulation.step(FIXED_STEP_SECONDS);
    const durations: number[] = [];
    for (let index = 0; index < BENCHMARK_FRAMES; index += 1) {
      const start = performance.now();
      simulation.step(FIXED_STEP_SECONDS);
      durations.push(performance.now() - start);
    }
    durations.sort((a, b) => a - b);
    const totalMs = durations.reduce((sum, value) => sum + value, 0);
    const average = totalMs / durations.length;
    const finalSnapshot = simulation.getSnapshot();
    const balls = finalSnapshot.balls;
    let penetratedPairs = 0;
    for (let first = 0; first < balls.length; first += 1) {
      for (let second = first + 1; second < balls.length; second += 1) {
        const dx = balls[first].x - balls[second].x;
        const dy = balls[first].y - balls[second].y;
        if (balls[first].radius + balls[second].radius - Math.hypot(dx, dy) > 0.01) penetratedPairs += 1;
      }
    }
    const finalOverlap = maxPairOverlap(balls);
    const finalStats = finalSnapshot.stats;
    const tuningLabel = `${tuning.velocityIterations}/${tuning.positionIterations}${tuning.allowedLinearError ? `/${tuning.allowedLinearError}` : ''}`;
    console.log(`${count.toString().padEnd(6)} ${shape.padEnd(7)} ${algorithm.padEnd(13)} ${tuningLabel.padEnd(12)} ${average.toFixed(3).padStart(11)} ${percentile(durations, 0.95).toFixed(3).padStart(13)} ${Math.round(1000 / average).toString().padStart(7)} ${finalStats.currentCount.toString().padStart(4)} ${finalStats.births.toString().padStart(7)} ${finalStats.missedBirths.toString().padStart(7)} ${seedOverlap.overlap.toFixed(4).padStart(12)} ${finalOverlap.overlap.toFixed(4).padStart(11)} ${penetratedPairs.toString().padStart(14)} ${finalOverlap.pair} (${finalOverlap.position})`);
    simulation.dispose();
    }
    }
  }
}
