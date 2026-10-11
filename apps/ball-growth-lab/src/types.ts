export type ArenaShape = 'circle';
export type EndReason = 'population-target' | 'single-ball' | 'no-balls' | 'manual';
export type RunState = 'setup' | 'starting' | 'running' | 'paused' | 'ending' | 'ended' | 'failed';
export type SnapshotShape = 'circle' | 'outline';
export const SIMULATION_SPEEDS = [1, 2, 4, 6] as const;
export type SimulationSpeed = typeof SIMULATION_SPEEDS[number];

export interface SimulationConfig {
  shape: ArenaShape;
  arenaSize: number;
  gapCount: number;
  ballDiameterRatio: number;
  gapWidthRatio: number;
  gravity: number;
  restitution: number;
  initialSpeed: number;
  speedSpread: number;
  initialDirection: number;
  directionSpread: number;
  initialCount: number;
  birthProbability: number;
  birthCooldown: number;
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
  /** Sum of ½|v|² for newborns under the unit-mass model. */
  birthKineticEnergyAdded: number;
  /** Sum of newborn velocities under the unit-mass model. */
  birthMomentumAdded: Point;
  maxSpeed: number;
  /** Sum of ball speed magnitudes at this snapshot. */
  speedSum: number;
  /** Cumulative approaching ball-ball contacts observed by the production solver. */
  collisionEvents: number;
  /** Sum of closing normal speeds for those contacts. */
  collisionClosingSpeedSum: number;
  cooldownAccepted: number;
  cooldownRejected: number;
  birthProbabilityPassed: number;
  birthSpaceAttempts: number;
}

export interface SimulationSnapshot {
  balls: BallSnapshot[];
  stats: SimulationStats;
  ended: boolean;
  endReason: EndReason | null;
}

export interface SimulationRenderSnapshot {
  /** Packed as id, x, y, radius, color for each ball. */
  ballData: Float32Array;
  stats: SimulationStats;
  ended: boolean;
  endReason: EndReason | null;
}

export type WorkerCommand =
  | { type: 'start'; config: SimulationConfig; runId: number }
  | { type: 'set-speed'; speed: SimulationSpeed }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'finish' }
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
  endReason: EndReason | null;
}

export const ARENA_HALF_EXTENT = 10;
export const MIN_ARENA_SIZE = 16;
export const MAX_ARENA_SIZE = 24;
export const MAX_ARENA_HALF_EXTENT = MAX_ARENA_SIZE / 2;
export const MAX_POPULATION = 1000;
export const MIN_POPULATION_TARGET = 10;
export const MIN_INITIAL_COUNT = 2;
export const MAX_INITIAL_COUNT = 100;
export const FIXED_STEP_SECONDS = 1 / 240;

export const DEFAULT_CONFIG: SimulationConfig = {
  shape: 'circle',
  arenaSize: ARENA_HALF_EXTENT * 2,
  gapCount: 0,
  ballDiameterRatio: 0.024,
  gapWidthRatio: 2,
  gravity: 0,
  restitution: 0.05,
  initialSpeed: 13.5,
  speedSpread: 0.3,
  initialDirection: 270,
  directionSpread: 120,
  initialCount: 2,
  birthProbability: 1,
  birthCooldown: 0,
  pairCooldown: 0,
  maxPopulation: 1000,
  seed: 'BALL-0426',
};
