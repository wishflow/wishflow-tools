import { createDefaultRegistry } from '../core/registry';
import { createRandom } from '../core/random';
import type { PlantBehavior } from '../core/types';
import { VASEBREAKER_LEVELS } from './levelCatalog';

export type VasePayload =
  | { kind: 'sun'; value: number }
  | { kind: 'plant'; typeId: string }
  | { kind: 'zombie'; typeId: string };

export interface VaseState {
  id: string;
  row: number;
  column: number;
  open: boolean;
  payload: VasePayload | null;
}

export interface PuzzlePlantState {
  id: string;
  typeId: string;
  row: number;
  column: number;
  health: number;
  nextActionTick: number;
}

export interface PuzzleZombieState {
  id: string;
  typeId: string;
  row: number;
  x: number;
  health: number;
  armorHealth: number;
  nextBiteTick: number;
}

export interface VasebreakerSnapshot {
  id: string;
  rows: number;
  columns: number;
  tick: number;
  phase: 'playing' | 'won' | 'lost';
  sun: number;
  vases: VaseState[];
  plants: PuzzlePlantState[];
  zombies: PuzzleZombieState[];
  zombiesKilled: number;
  closedVaseCount: number;
  boardsCleared: number;
}

export interface VasebreakerOptions {
  seed?: string;
  levelId?: string;
  rows?: number;
  columns?: number;
}

export class VasebreakerRuntime {
  readonly seed: string;
  readonly levelId: string;
  readonly rows: number;
  readonly columns: number;
  private readonly random: () => number;
  private readonly plantDefinitions = createDefaultRegistry().plants;
  private readonly zombieDefinitions = createDefaultRegistry().zombies;
  private readonly level: (typeof VASEBREAKER_LEVELS)[number];
  private vases: VaseState[];
  private plants: PuzzlePlantState[] = [];
  private zombies: PuzzleZombieState[] = [];
  private tick = 0;
  private phase: VasebreakerSnapshot['phase'] = 'playing';
  private sun = 0;
  private sequence = 0;
  private zombiesKilled = 0;
  private boardsCleared = 0;

  constructor(options: VasebreakerOptions = {}) {
    this.seed = options.seed ?? 'vasebreaker-default';
    this.level = VASEBREAKER_LEVELS.find((level) => level.id === (options.levelId ?? 'vasebreaker')) ?? VASEBREAKER_LEVELS[0]!;
    this.levelId = this.level.id;
    this.rows = options.rows ?? this.level.rows;
    this.columns = options.columns ?? this.level.columns;
    if (!Number.isInteger(this.rows) || this.rows < 1 || this.rows > 8) throw new Error('Vasebreaker rows must be between 1 and 8.');
    if (!Number.isInteger(this.columns) || this.columns < 1 || this.columns > 12) throw new Error('Vasebreaker columns must be between 1 and 12.');
    this.random = createRandom(this.seed);
    this.vases = this.createVases();
  }

  breakVase(id: string): boolean {
    if (this.phase !== 'playing') return false;
    const vase = this.vases.find((candidate) => candidate.id === id);
    if (!vase || vase.open) return false;
    vase.open = true;
    const payload = vase.payload;
    vase.payload = null;
    if (!payload) return true;
    if (payload.kind === 'sun') {
      this.sun += payload.value;
    } else if (payload.kind === 'plant') {
      const definition = this.plantDefinitions.get(payload.typeId);
      if (!definition) throw new Error('Unknown Vasebreaker plant: ' + payload.typeId);
      this.sequence += 1;
      this.plants.push({
        id: 'vase-plant-' + this.sequence,
        typeId: payload.typeId,
        row: vase.row,
        column: vase.column,
        health: definition.maxHealth,
        nextActionTick: this.tick + (definition.attackIntervalTicks ?? 30),
      });
    } else {
      const definition = this.zombieDefinitions.get(payload.typeId);
      if (!definition) throw new Error('Unknown Vasebreaker zombie: ' + payload.typeId);
      this.sequence += 1;
      this.zombies.push({
        id: 'vase-zombie-' + this.sequence,
        typeId: payload.typeId,
        row: vase.row,
        x: vase.column + 0.55,
        health: definition.maxHealth,
        armorHealth: definition.armorHealth ?? 0,
        nextBiteTick: this.tick,
      });
    }
    this.resolveEnd();
    return true;
  }

  step(ticks = 1): void {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('ticks must be a non-negative integer.');
    for (let index = 0; index < ticks && this.phase === 'playing'; index += 1) {
      this.tick += 1;
      this.processPlants();
      this.processZombies();
      this.removeDeadEntities();
      this.resolveEnd();
    }
  }

  getSnapshot(): VasebreakerSnapshot {
    return {
      id: this.levelId,
      rows: this.rows,
      columns: this.columns,
      tick: this.tick,
      phase: this.phase,
      sun: this.sun,
      vases: this.vases.map((vase) => ({ ...vase, payload: vase.payload ? { ...vase.payload } : null })),
      plants: this.plants.map((plant) => ({ ...plant })),
      zombies: this.zombies.map((zombie) => ({ ...zombie })),
      zombiesKilled: this.zombiesKilled,
      closedVaseCount: this.vases.filter((vase) => !vase.open).length,
      boardsCleared: this.boardsCleared,
    };
  }

  private createVases(): VaseState[] {
    const cells = Array.from({ length: this.rows * this.columns }, (_, index) => index);
    for (let index = cells.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1));
      [cells[index], cells[swapIndex]] = [cells[swapIndex]!, cells[index]!];
    }
    const plantCount = Math.max(1, Math.floor(cells.length * this.level.plantRatio));
    const zombieCount = Math.max(1, Math.floor(cells.length * this.level.zombieRatio));
    const plantCells = new Set(cells.slice(0, plantCount));
    const zombieCells = new Set(cells.slice(plantCount, plantCount + zombieCount));
    return Array.from({ length: this.rows * this.columns }, (_, index) => {
      const payload: VasePayload = plantCells.has(index)
        ? { kind: 'plant', typeId: this.level.plantPayloads[Math.floor(this.random() * this.level.plantPayloads.length)]! }
        : zombieCells.has(index)
          ? { kind: 'zombie', typeId: this.level.zombiePayloads[Math.floor(this.random() * this.level.zombiePayloads.length)]! }
          : { kind: 'sun', value: 25 };
      return { id: 'vase-' + index, row: Math.floor(index / this.columns), column: index % this.columns, open: false, payload };
    });
  }

  private processPlants(): void {
    for (const plant of this.plants) {
      const definition = this.plantDefinitions.get(plant.typeId);
      if (!definition || plant.nextActionTick > this.tick) continue;
      if (definition.behavior === 'sunflower') {
        this.sun += definition.sunValue ?? 25;
        plant.nextActionTick = this.tick + (definition.sunIntervalTicks ?? 720);
      } else if (definition.behavior === 'bomb') {
        for (const zombie of this.zombies) {
          if (zombie.row === plant.row && Math.abs(zombie.x - plant.column) <= (definition.blastRadius ?? 1.4)) zombie.health = 0;
        }
        plant.health = 0;
      } else if (this.isShooter(definition.behavior)) {
        const target = this.zombies
          .filter((zombie) => zombie.row === plant.row && zombie.x >= plant.column)
          .sort((left, right) => left.x - right.x)[0];
        if (target) {
          this.damageZombie(target, definition.damage ?? 20);
          plant.nextActionTick = this.tick + (definition.attackIntervalTicks ?? 90);
        }
      } else {
        plant.nextActionTick = Number.MAX_SAFE_INTEGER;
      }
    }
  }

  private processZombies(): void {
    for (const zombie of this.zombies) {
      const definition = this.zombieDefinitions.get(zombie.typeId);
      if (!definition) continue;
      const plant = this.plants
        .filter((candidate) => candidate.row === zombie.row && zombie.x <= candidate.column + 0.75 && zombie.x >= candidate.column - 0.15)
        .sort((left, right) => right.column - left.column)[0];
      if (plant) {
        if (this.tick >= zombie.nextBiteTick) {
          plant.health -= definition.biteDamage;
          zombie.nextBiteTick = this.tick + definition.biteIntervalTicks;
        }
      } else {
        zombie.x -= definition.speedPerTick;
        if (zombie.x < -0.4) this.phase = 'lost';
      }
    }
  }

  private damageZombie(zombie: PuzzleZombieState, damage: number): void {
    const absorbed = Math.min(zombie.armorHealth, damage);
    zombie.armorHealth -= absorbed;
    zombie.health -= damage - absorbed;
  }

  private removeDeadEntities(): void {
    const killed = this.zombies.filter((zombie) => zombie.health <= 0);
    this.zombiesKilled += killed.length;
    this.zombies = this.zombies.filter((zombie) => zombie.health > 0);
    this.plants = this.plants.filter((plant) => plant.health > 0);
  }

  private resolveEnd(): void {
    if (this.phase !== 'playing') return;
    if (this.vases.every((vase) => vase.open) && this.zombies.length === 0) {
      if (this.level.endless) {
        this.boardsCleared += 1;
        this.plants = [];
        this.vases = this.createVases();
      } else {
        this.phase = 'won';
      }
    }
  }

  private isShooter(behavior: PlantBehavior): boolean {
    return ['shooter', 'slow-shooter', 'multi-shooter', 'multi-lane-shooter', 'area-shooter', 'catapult'].includes(behavior);
  }
}
