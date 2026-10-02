export type ArenaShape = 'square' | 'circle';
export type MotionField = 'gravity' | 'curvature';
export type RunState = 'setup' | 'running' | 'paused' | 'ended';
export type SnapshotShape = 'circle' | 'outline';

export interface SimulationConfig {
  shape: ArenaShape;
  arenaSize: number;
  gapCount: number;
  ballDiameterRatio: number;
  gapWidthRatio: number;
  motionField: MotionField;
  gravity: number;
  curvatureRate: number;
  restitution: number;
  initialSpeed: number;
  speedSpread: number;
  initialDirection: number;
  directionSpread: number;
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
  birthAttempts: number;
  exits: number;
  missedBirths: number;
  missedSpaceBirths: number;
  missedEnergyBirths: number;
  maxSpeed: number;
}

export interface SimulationSnapshot {
  balls: BallSnapshot[];
  stats: SimulationStats;
  ended: boolean;
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
  ended: boolean;
}

export const ARENA_HALF_EXTENT = 10;
export const MIN_ARENA_SIZE = 16;
export const MAX_ARENA_SIZE = 24;
export const MAX_ARENA_HALF_EXTENT = MAX_ARENA_SIZE / 2;
export const MAX_POPULATION = 1000;
export const MIN_INITIAL_COUNT = 2;
export const MAX_INITIAL_COUNT = 100;
export const FIXED_STEP_SECONDS = 1 / 240;

export const DEFAULT_CONFIG: SimulationConfig = {
  shape: 'square',
  arenaSize: ARENA_HALF_EXTENT * 2,
  gapCount: 0,
  ballDiameterRatio: 0.024,
  gapWidthRatio: 2,
  motionField: 'curvature',
  gravity: 2,
  curvatureRate: 1.1,
  restitution: 1,
  initialSpeed: 11,
  speedSpread: 0.3,
  initialDirection: 270,
  directionSpread: 120,
  initialCount: 2,
  birthProbability: 0.35,
  pairCooldown: 0.7,
  maxPopulation: 1000,
  seed: 'BALL-0426',
};
