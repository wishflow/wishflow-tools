import { createRandom } from '../core/random';

export type WhackPhase = 'playing' | 'won' | 'lost';

export interface WhackTarget {
  id: number;
  row: number;
  column: number;
  expiresAtTick: number;
}

export interface WhackSnapshot {
  seed: string;
  tick: number;
  rows: number;
  columns: number;
  phase: WhackPhase;
  score: number;
  lives: number;
  spawnedTargets: number;
  targetCount: number;
  activeTarget: WhackTarget | null;
}

export class WhackAZombieRuntime {
  readonly seed: string;
  readonly rows = 5;
  readonly columns = 9;
  readonly targetCount: number;
  readonly targetLifetimeTicks: number;

  private readonly random: () => number;
  private tick = 0;
  private phase: WhackPhase = 'playing';
  private score = 0;
  private lives = 3;
  private spawnedTargets = 0;
  private nextSpawnTick = 1;
  private activeTarget: WhackTarget | null = null;

  constructor(seed = 'whack-default', options: { targetCount?: number; targetLifetimeTicks?: number } = {}) {
    this.seed = seed;
    this.random = createRandom(seed);
    this.targetCount = options.targetCount ?? 20;
    this.targetLifetimeTicks = options.targetLifetimeTicks ?? 90;
    if (!Number.isInteger(this.targetCount) || this.targetCount < 1) throw new Error('targetCount must be a positive integer.');
    if (!Number.isInteger(this.targetLifetimeTicks) || this.targetLifetimeTicks < 1) throw new Error('targetLifetimeTicks must be a positive integer.');
  }

  step(ticks = 1): void {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('ticks must be a non-negative integer.');
    for (let index = 0; index < ticks && this.phase === 'playing'; index += 1) {
      this.tick += 1;
      if (this.activeTarget && this.activeTarget.expiresAtTick <= this.tick) {
        this.activeTarget = null;
        this.lives -= 1;
        if (this.lives <= 0) {
          this.phase = 'lost';
          continue;
        }
        if (this.spawnedTargets >= this.targetCount) {
          this.phase = 'lost';
          continue;
        }
      }
      if (!this.activeTarget && this.spawnedTargets < this.targetCount && this.tick >= this.nextSpawnTick) {
        const row = Math.floor(this.random() * this.rows);
        const column = Math.floor(this.random() * this.columns);
        this.spawnedTargets += 1;
        this.activeTarget = {
          id: this.spawnedTargets,
          row,
          column,
          expiresAtTick: this.tick + this.targetLifetimeTicks,
        };
        this.nextSpawnTick = this.tick + 45;
      }
    }
  }

  whack(row: number, column: number): boolean {
    if (this.phase !== 'playing' || !Number.isInteger(row) || !Number.isInteger(column)
      || row < 0 || row >= this.rows || column < 0 || column >= this.columns) return false;
    if (!this.activeTarget || this.activeTarget.row !== row || this.activeTarget.column !== column) return false;
    this.activeTarget = null;
    this.score += 1;
    if (this.score >= this.targetCount) this.phase = 'won';
    return true;
  }

  getSnapshot(): WhackSnapshot {
    return {
      seed: this.seed,
      tick: this.tick,
      rows: this.rows,
      columns: this.columns,
      phase: this.phase,
      score: this.score,
      lives: this.lives,
      spawnedTargets: this.spawnedTargets,
      targetCount: this.targetCount,
      activeTarget: this.activeTarget ? { ...this.activeTarget } : null,
    };
  }
}
