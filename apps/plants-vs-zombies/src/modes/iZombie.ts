import { createDefaultRegistry } from '../core/registry';
import { I_ZOMBIE_LEVELS, type IZombieLevel } from './levelCatalog';

export type IZombiePhase = 'playing' | 'won' | 'lost';

export interface IZombiePlantState {
  id: string;
  typeId: string;
  row: number;
  column: number;
  health: number;
  nextAttackTick: number;
}

export interface IZombieEntityState {
  id: string;
  typeId: string;
  row: number;
  x: number;
  health: number;
  armorHealth: number;
  nextBiteTick: number;
  hasJumped: boolean;
}

export interface IZombieSnapshot {
  id: string;
  rows: number;
  columns: number;
  tick: number;
  phase: IZombiePhase;
  brains: number;
  zombies: IZombieEntityState[];
  plants: IZombiePlantState[];
  spawnedCount: number;
  killedCount: number;
  leakedCount: number;
  roundsCleared: number;
  availableZombieIds: string[];
}

export const I_ZOMBIE_COSTS: Readonly<Record<string, number>> = Object.freeze({
  basic: 50,
  conehead: 75,
  'pole-vaulter': 75,
  buckethead: 125,
  balloon: 100,
  digger: 100,
  'screen-door': 125,
  football: 175,
  dancer: 225,
  pogo: 150,
  snorkel: 125,
  bobsled: 175,
  'jack-in-the-box': 150,
  bungee: 125,
  catapult: 200,
  gargantuar: 300,
  imp: 50,
});

const PLANT_LAYOUT: Array<{ typeId: string; row: number; column: number }> = [
  { typeId: 'sunflower', row: 0, column: 1 }, { typeId: 'peashooter', row: 0, column: 3 }, { typeId: 'wall-nut', row: 0, column: 6 },
  { typeId: 'repeater', row: 1, column: 3 }, { typeId: 'wall-nut', row: 1, column: 5 },
  { typeId: 'peashooter', row: 2, column: 2 }, { typeId: 'wall-nut', row: 2, column: 5 },
  { typeId: 'peashooter', row: 3, column: 2 }, { typeId: 'sunflower', row: 3, column: 4 }, { typeId: 'wall-nut', row: 3, column: 6 },
  { typeId: 'snow-pea', row: 4, column: 3 }, { typeId: 'wall-nut', row: 4, column: 6 },
];

export class IZombieRuntime {
  readonly seed: string;
  readonly levelId: string;
  readonly rows: number;
  readonly columns = 9;
  private readonly plants: IZombiePlantState[] = [];
  private zombies: IZombieEntityState[] = [];
  private tick = 0;
  private phase: IZombiePhase = 'playing';
  private brains = 250;
  private sequence = 0;
  private spawnedCount = 0;
  private killedCount = 0;
  private leakedCount = 0;
  private roundLeakCount = 0;
  private roundsCleared = 0;
  private readonly definitions = createDefaultRegistry();
  private readonly level: IZombieLevel;

  constructor(seed = 'i-zombie-default', levelId = 'i-zombie') {
    this.seed = seed;
    this.level = I_ZOMBIE_LEVELS.find((level) => level.id === levelId) ?? I_ZOMBIE_LEVELS[0]!;
    this.levelId = this.level.id;
    this.rows = this.level.id === 'three-hit-wonder' ? 3 : 5;
    this.plants.push(...this.createPlantLayout(this.level.layout));
    this.brains = this.level.brains;
  }

  private createPlantLayout(variant: number): IZombiePlantState[] {
    const base = this.rows === 3
      ? Array.from({ length: this.rows }, (_, row) => [
        { typeId: row === 1 ? 'wall-nut' : 'sunflower', row, column: 1 },
        { typeId: 'peashooter', row, column: 3 },
        { typeId: 'wall-nut', row, column: 5 },
      ]).flat()
      : variant === 3
      ? Array.from({ length: this.rows }, (_, row) => [
        { typeId: 'wall-nut', row, column: 2 }, { typeId: 'wall-nut', row, column: 5 }, { typeId: 'peashooter', row, column: 7 },
      ]).flat()
      : variant === 4
        ? Array.from({ length: this.rows }, (_, row) => [
          { typeId: row % 2 === 0 ? 'cactus' : 'peashooter', row, column: 3 }, { typeId: 'wall-nut', row, column: 6 },
        ]).flat()
        : variant === 5
          ? Array.from({ length: this.rows }, (_, row) => [
            { typeId: 'tall-nut', row, column: 4 }, { typeId: row % 2 ? 'repeater' : 'melon-pult', row, column: 6 },
          ]).flat()
          : PLANT_LAYOUT.map((plant) => {
            const row = (plant.row + variant) % this.rows;
            const column = variant % 2 === 1 ? this.columns - 1 - plant.column : plant.column;
            const typeId = variant === 2 && column === 1 ? 'wall-nut'
              : variant === 6 && plant.typeId === 'wall-nut' ? 'peashooter'
                : variant === 7 && row > 2 ? 'repeater'
                  : plant.typeId;
            return { typeId, row, column };
          });
    return base.map((plant, index) => ({
      id: 'i-plant-' + index,
      ...plant,
      health: this.definitions.plants.get(plant.typeId)?.maxHealth ?? 300,
      nextAttackTick: 0,
    }));
  }

  spawnZombie(typeId: string, row: number): boolean {
    if (this.phase !== 'playing' || !Number.isInteger(row) || row < 0 || row >= this.rows) return false;
    const definition = this.definitions.zombies.get(typeId);
    const cost = I_ZOMBIE_COSTS[typeId];
    if (!definition || cost === undefined || !this.level.zombieIds.includes(typeId) || this.brains < cost) return false;
    this.sequence += 1;
    this.brains -= cost;
    this.spawnedCount += 1;
    this.zombies.push({
      id: 'i-zombie-' + this.sequence,
      typeId,
      row,
      x: this.columns - 0.25,
      health: definition.maxHealth,
      armorHealth: definition.armorHealth ?? 0,
      nextBiteTick: this.tick,
      hasJumped: false,
    });
    return true;
  }

  step(ticks = 1): void {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('ticks must be a non-negative integer.');
    for (let index = 0; index < ticks && this.phase === 'playing'; index += 1) {
      this.tick += 1;
      this.processPlants();
      this.processZombies();
      this.removeDead();
      if (this.roundLeakCount >= this.rows) {
        if (this.level.endless) this.startNextRound();
        else this.phase = 'won';
      } else if (this.zombies.length === 0 && !this.level.zombieIds.some((typeId) => this.brains >= I_ZOMBIE_COSTS[typeId]!)) this.phase = 'lost';
    }
  }

  getSnapshot(): IZombieSnapshot {
    return {
      id: this.levelId,
      rows: this.rows,
      columns: this.columns,
      tick: this.tick,
      phase: this.phase,
      brains: this.brains,
      zombies: this.zombies.map((zombie) => ({ ...zombie })),
      plants: this.plants.map((plant) => ({ ...plant })),
      spawnedCount: this.spawnedCount,
      killedCount: this.killedCount,
      leakedCount: this.leakedCount,
      roundsCleared: this.roundsCleared,
      availableZombieIds: [...this.level.zombieIds],
    };
  }

  private startNextRound(): void {
    this.roundsCleared += 1;
    this.roundLeakCount = 0;
    this.brains = this.level.brains + this.roundsCleared * 50;
    this.zombies = [];
    this.plants.splice(0, this.plants.length, ...this.createPlantLayout((this.level.layout + this.roundsCleared) % 10));
  }

  private processPlants(): void {
    for (const plant of this.plants) {
      const definition = this.definitions.plants.get(plant.typeId);
      if (!definition || !['shooter', 'slow-shooter', 'multi-shooter'].includes(definition.behavior) || this.tick < plant.nextAttackTick) continue;
      const target = this.zombies
        .filter((zombie) => zombie.row === plant.row && zombie.x <= plant.column - 0.2)
        .sort((left, right) => right.x - left.x)[0];
      if (!target) continue;
      const damage = definition.damage ?? 20;
      const absorbed = Math.min(target.armorHealth, damage);
      target.armorHealth -= absorbed;
      target.health -= damage - absorbed;
      plant.nextAttackTick = this.tick + (definition.attackIntervalTicks ?? 90);
    }
  }

  private processZombies(): void {
    for (const zombie of this.zombies) {
      const definition = this.definitions.zombies.get(zombie.typeId);
      if (!definition) continue;
      const plant = this.plants
        .filter((candidate) => candidate.health > 0 && candidate.row === zombie.row && zombie.x <= candidate.column + 0.75 && zombie.x >= candidate.column - 0.3)
        .sort((left, right) => right.column - left.column)[0];
      if (plant) {
        if ((definition.behavior === 'pole-vault' || definition.behavior === 'jumper') && !zombie.hasJumped) {
          zombie.x = plant.column - 0.35;
          zombie.hasJumped = true;
          zombie.nextBiteTick = this.tick + definition.biteIntervalTicks;
        } else if (this.tick >= zombie.nextBiteTick) {
          plant.health -= definition.biteDamage;
          zombie.nextBiteTick = this.tick + definition.biteIntervalTicks;
        }
      } else {
        zombie.x -= definition.speedPerTick;
        if (zombie.x < -0.35 && zombie.health > 0) {
          zombie.health = 0;
          this.leakedCount += 1;
          this.roundLeakCount += 1;
        }
      }
    }
  }

  private removeDead(): void {
    this.killedCount += this.zombies.filter((zombie) => zombie.health <= 0).length;
    this.zombies = this.zombies.filter((zombie) => zombie.health > 0 && zombie.x >= -0.35);
    for (let index = this.plants.length - 1; index >= 0; index -= 1) {
      if (this.plants[index]!.health <= 0) this.plants.splice(index, 1);
    }
  }
}
