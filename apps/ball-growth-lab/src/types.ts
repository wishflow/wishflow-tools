export type ArenaShape = 'square' | 'circle';
export type RunState = 'setup' | 'running' | 'paused';
export type SnapshotShape = 'circle' | 'outline';

export interface SimulationConfig {
  shape: ArenaShape;
  gapCount: number;
  ballDiameterRatio: number;
  gapWidthRatio: number;
  gravity: number;
  restitution: number;
  initialCount: number;
  birthProbability: number;
  pairCooldown: number;
  maxPopulation: number;
  seed: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface SpawnSeed {
  position: Point;
  velocity?: Point;
}

export interface BallSnapshot {
  id: number;
  x: number;
  y: number;
  radius: number;
  color: number;
  shape: SnapshotShape;
}

export interface SimulationStats {
  elapsedSeconds: number;
  currentCount: number;
  births: number;
  exits: number;
  missedBirths: number;
}

export interface SimulationSnapshot {
  balls: BallSnapshot[];
  stats: SimulationStats;
}

export type WorkerCommand =
  | { type: 'start'; config: SimulationConfig; runId: number }
  | { type: 'reset'; config: SimulationConfig; runId: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' };

export interface WorkerStats extends SimulationStats {
  physicsFps: number;
}

export interface WorkerSnapshotMessage {
  type: 'snapshot';
  runId: number;
  sequence: number;
  time: number;
  ballData: ArrayBuffer;
  ballCount: number;
  stats: WorkerStats;
}

export const ARENA_HALF_EXTENT = 10;
export const MAX_POPULATION = 1000;
export const MIN_INITIAL_COUNT = 2;
export const MAX_INITIAL_COUNT = 100;
export const FIXED_STEP_SECONDS = 1 / 60;

export const DEFAULT_CONFIG: SimulationConfig = {
  shape: 'square',
  gapCount: 0,
  ballDiameterRatio: 0.024,
  gapWidthRatio: 2,
  gravity: 9.8,
  restitution: 0.9,
  initialCount: 2,
  birthProbability: 0.35,
  pairCooldown: 0.7,
  maxPopulation: 1000,
  seed: 'BALL-0426',
};
