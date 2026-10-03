import * as RapierBenchmark from '@dimforge/rapier2d-compat';
import { PlanckSimulation } from './experimental/PlanckSimulation';
import { initializeRapier, RapierSimulation } from '../src/physics/RapierSimulation';
import { ARENA_HALF_EXTENT, FIXED_STEP_SECONDS, type ArenaShape, type SimulationConfig } from '../src/types';

const GAP_WIDTH_RATIOS = [1.05, 1.25, 1.45, 1.75, 2, 2.5, 3];
const SAMPLE_OFFSETS = Number(process.env.GAP_SCAN_SAMPLES ?? 17);
const TRIAL_STEPS = 960;
const SHAPES: ArenaShape[] = ['circle'];
const ALGORITHMS = (process.env.GAP_SCAN_ALGORITHMS ?? 'rapier,planck')
  .split(',')
  .filter((algorithm): algorithm is 'rapier' | 'planck' => algorithm === 'rapier' || algorithm === 'planck');

if (ALGORITHMS.includes('rapier')) await initializeRapier(RapierBenchmark);

function trialConfig(shape: ArenaShape, gapWidthRatio: number, seed: string): SimulationConfig {
  return {
    shape,
    arenaSize: ARENA_HALF_EXTENT * 2,
    gapCount: 2,
    ballDiameterRatio: 0.024,
    gapWidthRatio,
    gravity: 9.8,
    restitution: 1,
    initialSpeed: 11,
    speedSpread: 0.3,
    initialDirection: 270,
    directionSpread: 120,
    initialCount: 2,
    birthProbability: 0,
    pairCooldown: 0.7,
    maxPopulation: 1000,
    seed,
  };
}

function passedThrough(algorithm: 'rapier' | 'planck', shape: ArenaShape, ratio: number, offset: number, run: number): boolean {
  const config = trialConfig(shape, ratio, `GAP-${shape}-${ratio}-${run}`);
  const radius = (config.arenaSize / 2) * config.ballDiameterRatio;
  const seeds = [{
    position: { x: offset, y: -ARENA_HALF_EXTENT - radius - 0.05 },
    velocity: { x: 0, y: 0 },
  }];
  const simulation = algorithm === 'rapier'
    ? new RapierSimulation(RapierBenchmark, config, seeds)
    : new PlanckSimulation(config, seeds);

  try {
    for (let step = 0; step < TRIAL_STEPS; step += 1) {
      simulation.step(FIXED_STEP_SECONDS);
      if (simulation.getSnapshot().stats.exits > 0) return true;
    }
    return false;
  } finally {
    simulation.dispose();
  }
}

console.log('Gap width scan · one ball falls through top and bottom openings · offset samples span ± one radius');
console.log(`solver   shape   gap/diam  passes/${SAMPLE_OFFSETS}  pass rate`);

for (const algorithm of ALGORITHMS) {
  for (const shape of SHAPES) {
    const radius = ARENA_HALF_EXTENT * 0.024;
    for (const ratio of GAP_WIDTH_RATIOS) {
      let passes = 0;
      for (let sample = 0; sample < SAMPLE_OFFSETS; sample += 1) {
        const offset = (((sample + 0.5) / SAMPLE_OFFSETS) * 2 - 1) * radius;
        if (passedThrough(algorithm, shape, ratio, offset, sample)) passes += 1;
      }
      console.log(`${algorithm.padEnd(8)} ${shape.padEnd(7)} ${ratio.toFixed(2).padEnd(9)} ${`${passes}/${SAMPLE_OFFSETS}`.padEnd(14)} ${(passes / SAMPLE_OFFSETS * 100).toFixed(1)}%`);
    }
  }
}
