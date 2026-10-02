import { DEFAULT_RAPIER_TUNING, MAX_ADAPTIVE_SUBSTEPS, MAX_TRAVEL_PER_SUBSTEP } from './physics/RapierSimulation';
import { FIXED_STEP_SECONDS, type RunState, type SimulationConfig, type SimulationStats } from './types';

export interface ReplayEnvironment {
  userAgent: string;
  language: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
}

export interface ReplayExportInput {
  config: SimulationConfig;
  runState: RunState;
  stats: SimulationStats;
  rendererFps: number;
  environment: ReplayEnvironment;
}

export function createReplayExport(input: ReplayExportInput) {
  return {
    format: 'ball-growth-lab.replay',
    formatVersion: 1,
    physics: {
      engine: 'Rapier2D',
      engineVersion: '0.21',
      fixedStepSeconds: FIXED_STEP_SECONDS,
      solver: DEFAULT_RAPIER_TUNING,
      adaptiveSubsteps: {
        maxSubsteps: MAX_ADAPTIVE_SUBSTEPS,
        maxTravelInBallRadii: MAX_TRAVEL_PER_SUBSTEP,
      },
    },
    config: input.config,
    environment: input.environment,
    observation: {
      runState: input.runState,
      elapsedSeconds: Number(input.stats.elapsedSeconds.toFixed(4)),
      physicsSteps: Math.round(input.stats.elapsedSeconds / FIXED_STEP_SECONDS),
      rendererFps: input.rendererFps,
      stats: input.stats,
    },
  };
}
