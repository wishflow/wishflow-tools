import { performance } from 'node:perf_hooks';
import * as RapierBenchmark from '@dimforge/rapier2d-compat';
import { CircleBatchSimulation, MAX_BATCH_TRAVEL_PER_SUBSTEP } from '../src/physics/CircleBatchSimulation';
import { PlanckSimulation } from './experimental/PlanckSimulation';
import { initializeRapier, RapierSimulation } from '../src/physics/RapierSimulation';
import type { SolverTuning } from '../src/physics/PhysicsAdapter';
import { ARENA_HALF_EXTENT, DEFAULT_CONFIG, FIXED_STEP_SECONDS, type Point, type SimulationConfig, type SpawnSeed } from '../src/types';

const COUNTS = (process.env.BENCHMARK_COUNTS ?? '100,500,1000').split(',').map(Number).filter(Number.isFinite);
const SHAPES = (process.env.BENCHMARK_SHAPES ?? 'circle').split(',').filter((shape): shape is 'circle' => shape === 'circle');
const DENSITIES = (process.env.BENCHMARK_DENSITIES ?? 'normal,high').split(',').filter((density): density is 'normal' | 'high' => density === 'normal' || density === 'high');
const ALGORITHMS = (process.env.BENCHMARK_ALGORITHMS ?? 'planck,circle-batch,rapier').split(',').filter((algorithm): algorithm is 'planck' | 'circle-batch' | 'rapier' => algorithm === 'planck' || algorithm === 'circle-batch' || algorithm === 'rapier');
const TUNINGS: SolverTuning[] = (process.env.BENCHMARK_TUNINGS ?? '4/2,6/2,8/3')
  .split(',')
  .map((value) => value.split('/').map(Number))
  .filter((parts) => (parts.length === 2 || parts.length === 3) && parts.every((part) => Number.isFinite(part) && part > 0))
  .map((parts) => ({ velocityIterations: parts[0], positionIterations: parts[1], allowedLinearError: parts[2] }));
const BENCHMARK_STEP_HZ = Number(process.env.BENCHMARK_STEP_HZ ?? Math.round(1 / FIXED_STEP_SECONDS));
const BENCHMARK_STEP_SECONDS = 1 / BENCHMARK_STEP_HZ;
const BENCHMARK_DURATION_SECONDS = Number(process.env.BENCHMARK_DURATION_SECONDS ?? 0.5);
const BENCHMARK_FRAMES = Number(process.env.BENCHMARK_FRAMES ?? Math.round(BENCHMARK_DURATION_SECONDS * BENCHMARK_STEP_HZ));
const WARMUP_FRAMES = Number(process.env.WARMUP_FRAMES ?? Math.round(BENCHMARK_DURATION_SECONDS * BENCHMARK_STEP_HZ * 0.25));
const BALL_DIAMETER_RATIO = Number(process.env.BENCHMARK_BALL_DIAMETER_RATIO ?? DEFAULT_CONFIG.ballDiameterRatio);
const INITIAL_SPEED = Number(process.env.BENCHMARK_INITIAL_SPEED ?? 6);
const GRAVITY = Number(process.env.BENCHMARK_GRAVITY ?? 0);
const BIRTH_PROBABILITY = Number(process.env.BENCHMARK_BIRTH_PROBABILITY ?? 0);
const PAIR_COOLDOWN = Number(process.env.BENCHMARK_PAIR_COOLDOWN ?? DEFAULT_CONFIG.pairCooldown);
const MAX_TRAVEL_PER_SUBSTEP = Number(process.env.BENCHMARK_MAX_TRAVEL_RADIUS_RATIO ?? 0.75);

if (ALGORITHMS.includes('rapier')) await initializeRapier(RapierBenchmark);

function createGridSeeds(count: number, radius: number, speed: number, density: 'normal' | 'high'): SpawnSeed[] {
  const points: Point[] = [];
  const spacing = radius * (density === 'normal' ? 2.4 : 2.05);
  const rowSpacing = spacing * Math.sqrt(3) / 2;
  const limit = ARENA_HALF_EXTENT - radius - 0.15;
  const rows = Math.ceil(limit / rowSpacing);
  const columns = Math.ceil(limit / spacing);

  for (let row = -rows; row <= rows; row += 1) {
    for (let column = -columns; column <= columns; column += 1) {
      const point: Point = { x: column * spacing + (Math.abs(row) % 2) * spacing / 2, y: row * rowSpacing };
      if (Math.hypot(point.x, point.y) > limit) continue;
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

function mechanicalEnergy(simulation: PlanckSimulation | CircleBatchSimulation | RapierSimulation, algorithm: string, gravity: number): { total: number; magnitude: number } {
  let total = 0;
  let magnitude = 0;
  const add = (mass: number, position: Point, velocity: Point) => {
    const kinetic = mass * (velocity.x ** 2 + velocity.y ** 2) / 2;
    const potential = -mass * gravity * position.y;
    total += kinetic + potential;
    magnitude += Math.abs(kinetic) + Math.abs(potential);
  };

  if (algorithm === 'rapier') {
    const internals = simulation as unknown as { balls: Map<number, { body: { mass(): number; translation(): Point; linvel(): Point } }> };
    for (const { body } of internals.balls.values()) add(body.mass(), body.translation(), body.linvel());
  } else if (algorithm === 'planck') {
    const internals = simulation as unknown as { balls: Map<number, { body: { getMass(): number; getPosition(): Point; getLinearVelocity(): Point } }> };
    for (const { body } of internals.balls.values()) add(body.getMass(), body.getPosition(), body.getLinearVelocity());
  } else {
    const internals = simulation as unknown as { count: number; radius: number; x: Float64Array; y: Float64Array; vx: Float64Array; vy: Float64Array };
    const mass = Math.PI * internals.radius ** 2;
    for (let index = 0; index < internals.count; index += 1) {
      add(mass, { x: internals.x[index], y: internals.y[index] }, { x: internals.vx[index], y: internals.vy[index] });
    }
  }
  return { total, magnitude };
}

console.log(`Fixed-step physics benchmark · ${BENCHMARK_STEP_HZ} Hz · diameter ratio ${BALL_DIAMETER_RATIO} · one local run · browser GPU/rendering excluded`);
console.log(`gravity ${GRAVITY} m/s² · initial speed ${INITIAL_SPEED} m/s · birth probability ${BIRTH_PROBABILITY} · pair cooldown ${PAIR_COOLDOWN}s · CircleBatch travel ${MAX_BATCH_TRAVEL_PER_SUBSTEP}r/substep · Rapier travel ${MAX_TRAVEL_PER_SUBSTEP}r/substep`);
console.log(`warmup ${WARMUP_FRAMES} steps · measure ${BENCHMARK_FRAMES} steps (${(BENCHMARK_FRAMES / BENCHMARK_STEP_HZ).toFixed(2)}s)`);
console.log(`balls density arena algorithm     solver  avg ms/step  p95 ms/step steps/s realtime@${BENCHMARK_STEP_HZ} end births missed energy-drift max-speed seed-overlap max-overlap penetrated-pairs worst pair/positions`);

for (const count of COUNTS) {
  for (const shape of SHAPES) {
    for (const density of DENSITIES) {
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
            gravity: GRAVITY,
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
          const seeds = createGridSeeds(count, radius, INITIAL_SPEED, density);
          const seedOverlap = maxPairOverlap(seeds.map((seed, index) => ({
            id: index + 1,
            x: seed.position.x,
            y: seed.position.y,
            radius,
          })));
          const simulation = algorithm === 'planck'
            ? new PlanckSimulation(config, seeds, tuning)
            : algorithm === 'rapier'
              ? new RapierSimulation(
                RapierBenchmark,
                config,
                seeds,
                { ...tuning, maxTravelPerSubstep: MAX_TRAVEL_PER_SUBSTEP },
                false,
              )
              : new CircleBatchSimulation(config, seeds, tuning, false);

          for (let index = 0; index < WARMUP_FRAMES; index += 1) simulation.step(BENCHMARK_STEP_SECONDS);
          const initialEnergy = mechanicalEnergy(simulation, algorithm, GRAVITY);
          const durations: number[] = [];
          for (let index = 0; index < BENCHMARK_FRAMES; index += 1) {
            const start = performance.now();
            simulation.step(BENCHMARK_STEP_SECONDS);
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
          const finalEnergy = mechanicalEnergy(simulation, algorithm, GRAVITY);
          const energyDrift = Math.abs(finalEnergy.total - initialEnergy.total) / Math.max(initialEnergy.magnitude, 1);
          const finalStats = finalSnapshot.stats;
          const tuningLabel = `${tuning.velocityIterations}/${tuning.positionIterations}${tuning.allowedLinearError ? `/${tuning.allowedLinearError}` : ''}`;
          const stepsPerSecond = 1000 / average;
          console.log(`${count.toString().padEnd(6)} ${density.padEnd(7)} ${shape.padEnd(5)} ${algorithm.padEnd(13)} ${tuningLabel.padEnd(12)} ${average.toFixed(3).padStart(11)} ${percentile(durations, 0.95).toFixed(3).padStart(12)} ${Math.round(stepsPerSecond).toString().padStart(7)} ${(stepsPerSecond / BENCHMARK_STEP_HZ).toFixed(2).padStart(12)} ${finalStats.currentCount.toString().padStart(4)} ${finalStats.births.toString().padStart(6)} ${finalStats.missedBirths.toString().padStart(6)} ${(energyDrift * 100).toFixed(4).padStart(12)}% ${finalStats.maxSpeed.toFixed(2).padStart(9)} ${seedOverlap.overlap.toFixed(4).padStart(12)} ${finalOverlap.overlap.toFixed(4).padStart(11)} ${penetratedPairs.toString().padStart(14)} ${finalOverlap.pair} (${finalOverlap.position})`);
          simulation.dispose();
        }
      }
    }
  }
}
