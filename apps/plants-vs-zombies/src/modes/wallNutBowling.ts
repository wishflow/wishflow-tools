import { createRandom } from '../core/random';

export interface BowlingZombieState {
  id: string;
  row: number;
  x: number;
  health: number;
}

export interface BowlingNutState {
  id: string;
  row: number;
  x: number;
  damage: number;
}

export interface WallNutBowlingSnapshot {
  id: string;
  rows: number;
  columns: number;
  tick: number;
  phase: 'playing' | 'won' | 'lost';
  score: number;
  lives: number;
  zombies: BowlingZombieState[];
  nuts: BowlingNutState[];
  cooldownTicks: number;
  targetCount: number;
}

export class WallNutBowlingRuntime {
  readonly seed: string;
  readonly rows = 5;
  readonly columns = 9;
  readonly id: string;
  readonly targetCount: number;
  private readonly random: () => number;
  private readonly zombieHealth: number;
  private readonly spawnIntervalTicks: number;
  private readonly zombieSpeedPerTick: number;
  private tick = 0;
  private phase: WallNutBowlingSnapshot['phase'] = 'playing';
  private score = 0;
  private lives = 3;
  private sequence = 0;
  private nextSpawnTick = 60;
  private nextThrowTick = 0;
  private zombies: BowlingZombieState[] = [];
  private nuts: BowlingNutState[] = [];

  constructor(seed = 'wall-nut-bowling-default', options: {
    id?: string;
    targetCount?: number;
    zombieHealth?: number;
    spawnIntervalTicks?: number;
    zombieSpeedPerTick?: number;
  } = {}) {
    this.seed = seed;
    this.random = createRandom(seed);
    this.id = options.id ?? 'wall-nut-bowling';
    this.targetCount = options.targetCount ?? 10;
    this.zombieHealth = options.zombieHealth ?? 400;
    this.spawnIntervalTicks = options.spawnIntervalTicks ?? 150;
    this.zombieSpeedPerTick = options.zombieSpeedPerTick ?? 0.012;
  }

  throwNut(row: number): boolean {
    if (this.phase !== 'playing' || !Number.isInteger(row) || row < 0 || row >= this.rows || this.tick < this.nextThrowTick) return false;
    this.sequence += 1;
    this.nuts.push({ id: 'nut-' + this.sequence, row, x: -0.35, damage: 400 });
    this.nextThrowTick = this.tick + 60;
    return true;
  }

  step(ticks = 1): void {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('ticks must be a non-negative integer.');
    for (let index = 0; index < ticks && this.phase === 'playing'; index += 1) {
      this.tick += 1;
      if (this.tick >= this.nextSpawnTick && this.score < this.targetCount) this.spawnZombie();
      for (const zombie of this.zombies) zombie.x -= this.zombieSpeedPerTick;
      const remainingNuts: BowlingNutState[] = [];
      for (const nut of this.nuts) {
        const previousX = nut.x;
        nut.x += 0.18;
        const target = this.zombies
          .filter((zombie) => zombie.row === nut.row && zombie.x >= previousX - 0.2 && zombie.x <= nut.x + 0.2)
          .sort((left, right) => left.x - right.x)[0];
        if (target) {
          target.health -= nut.damage;
          nut.damage = Math.round(nut.damage * 0.75);
        }
        if (nut.x < this.columns + 0.5 && nut.damage > 5) remainingNuts.push(nut);
      }
      this.nuts = remainingNuts;
      const defeated = this.zombies.filter((zombie) => zombie.health <= 0);
      this.score += defeated.length;
      const leaked = this.zombies.filter((zombie) => zombie.x < -0.45);
      this.lives -= leaked.length;
      this.zombies = this.zombies.filter((zombie) => zombie.health > 0 && zombie.x >= -0.45);
      if (this.score >= this.targetCount) this.phase = 'won';
      else if (this.lives <= 0) this.phase = 'lost';
    }
  }

  getSnapshot(): WallNutBowlingSnapshot {
    return {
      id: this.id,
      rows: this.rows,
      columns: this.columns,
      tick: this.tick,
      phase: this.phase,
      score: this.score,
      lives: this.lives,
      zombies: this.zombies.map((zombie) => ({ ...zombie })),
      nuts: this.nuts.map((nut) => ({ ...nut })),
      cooldownTicks: Math.max(0, this.nextThrowTick - this.tick),
      targetCount: this.targetCount,
    };
  }

  private spawnZombie(): void {
    this.sequence += 1;
    this.zombies.push({
      id: 'bowling-zombie-' + this.sequence,
      row: Math.floor(this.random() * this.rows),
      x: this.columns + 0.2,
      health: this.zombieHealth,
    });
    this.nextSpawnTick = this.tick + this.spawnIntervalTicks;
  }
}
