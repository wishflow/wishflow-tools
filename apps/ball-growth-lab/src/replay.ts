import { DEFAULT_CIRCLE_BATCH_TUNING, MAX_BATCH_SUBSTEPS, MAX_BATCH_TRAVEL_PER_SUBSTEP } from './physics/CircleBatchSimulation';
import { FIXED_STEP_SECONDS, type EndReason, type RunState, type SimulationConfig, type SimulationStats } from './types';

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
  endReason: EndReason | null;
  stats: SimulationStats;
  rendererFps: number;
  environment: ReplayEnvironment;
}

export function createReplayExport(input: ReplayExportInput) {
  return {
    format: 'ball-growth-lab.replay',
    formatVersion: 3,
    physics: {
      engine: 'CircleBatch2D',
      engineVersion: '1',
      fixedStepSeconds: FIXED_STEP_SECONDS,
      solver: DEFAULT_CIRCLE_BATCH_TUNING,
      adaptiveSubsteps: {
        maxSubsteps: MAX_BATCH_SUBSTEPS,
        maxTravelInBallRadii: MAX_BATCH_TRAVEL_PER_SUBSTEP,
      },
    },
    config: input.config,
    environment: input.environment,
    observation: {
      runState: input.runState,
      endReason: input.endReason,
      elapsedSeconds: Number(input.stats.elapsedSeconds.toFixed(4)),
      physicsSteps: Math.round(input.stats.elapsedSeconds / FIXED_STEP_SECONDS),
      rendererFps: input.rendererFps,
      stats: input.stats,
    },
  };
}
