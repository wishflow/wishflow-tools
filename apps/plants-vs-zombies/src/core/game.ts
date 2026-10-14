import { createDefaultRegistry, type GameRegistry } from './registry';
import { createRandom } from './random';
import { createAdventureWaves } from './adventureWaves';
import { createSurvivalStageWaves } from './survivalWaves';
import type {
  CommandResult,
  GameCommand,
  GameEvent,
  GameMetrics,
  GameOptions,
  GamePhase,
  GameSnapshot,
  LevelDefinition,
  MowerEntity,
  PlantDefinition,
  PlantEntity,
  ProjectileEntity,
  SunEntity,
  ZombieEntity,
} from './types';

interface MutableState {
  phase: GamePhase;
  tick: number;
  sun: number;
  selectedPlantId: string | null;
  allowedPlantIds: string[];
  plants: PlantEntity[];
  graves: Array<{ row: number; column: number }>;
  zombies: ZombieEntity[];
  projectiles: ProjectileEntity[];
  suns: SunEntity[];
  mowers: MowerEntity[];
  spawnedWaveCount: number;
  lastSkySunTick: number;
  nextWaveEarliestTick: number;
  waitingForNextWave: boolean;
  plantCooldowns: Map<string, number>;
}

function cloneSnapshot(level: LevelDefinition, state: MutableState, registry: GameRegistry): GameSnapshot {
  const fogRevealedCells = level.terrain === 'fog'
    ? state.plants
      .filter((plant) => registry.plants.get(plant.typeId)?.ability === 'reveal-fog')
      .flatMap((plant) => {
        const cells: Array<{ row: number; column: number }> = [];
        for (let row = Math.max(0, plant.row - 1); row <= Math.min(level.rows - 1, plant.row + 1); row += 1) {
          for (let column = Math.max(0, plant.column - 3); column <= Math.min(level.columns - 1, plant.column + 3); column += 1) {
            cells.push({ row, column });
          }
        }
        return cells;
      })
    : [];
  return {
    levelId: level.id,
    terrain: level.terrain ?? 'day',
    waterRows: [...(level.waterRows ?? (level.terrain === 'pool' || level.terrain === 'fog' ? [2, 3] : []))],
    rows: level.rows,
    columns: level.columns,
    phase: state.phase,
    tick: state.tick,
    sun: state.sun,
    selectedPlantId: state.selectedPlantId,
    allowedPlantIds: [...state.allowedPlantIds],
    plants: state.plants
      .map((plant) => ({ ...plant }))
      .sort((left, right) => ({ platform: 0, base: 1, overlay: 2 }[left.slot] - { platform: 0, base: 1, overlay: 2 }[right.slot])),
    zombies: state.zombies.map((zombie) => ({ ...zombie })),
    projectiles: state.projectiles.map((projectile) => ({ ...projectile })),
    suns: state.suns.map((sun) => ({ ...sun })),
    mowers: state.mowers.map((mower) => ({ ...mower })),
    graves: state.graves.map((grave) => ({ ...grave })),
    fogRevealedCells,
    spawnedWaveCount: state.spawnedWaveCount,
    waveCount: level.waves.length,
  };
}

export class GameRuntime {
  readonly seed: string;
  readonly level: LevelDefinition;
  readonly registry: GameRegistry;

  private readonly random: () => number;
  private readonly state: MutableState;
  private readonly eventQueue: GameEvent[] = [];
  private sequence = 0;
  private sunSpent = 0;
  private sunCollected = 0;
  private plantsPlanted = 0;
  private zombiesSpawned = 0;
  private zombiesKilled = 0;
  private mowersUsed = 0;
  private readonly maxLoadoutSize: number;

  constructor(options: GameOptions = {}) {
    this.seed = options.seed ?? 'pvz-default';
    this.random = createRandom(this.seed);
    this.registry = options.registry ?? createDefaultRegistry();
    const selectedLevel = options.level ?? this.registry.levels.get(options.levelId ?? '1-1');
    if (!selectedLevel) throw new Error('Unknown level: ' + (options.levelId ?? '1-1'));
    this.level = structuredClone(selectedLevel);
    if (this.level.adventureWavePlan) {
      const firstPlaythrough = options.adventureFirstPlaythrough ?? true;
      if (!firstPlaythrough && this.level.adventureWavePlan.levelNumber === 1) this.level.rows = 5;
      this.level.waves = createAdventureWaves(
        this.level.adventureWavePlan,
        this.level.rows,
        this.seed,
        firstPlaythrough,
        this.registry.zombies,
      );
    }
    for (const wave of this.level.waves) {
      for (const spawn of wave.zombies) {
        if (!this.registry.zombies.has(spawn.typeId)) {
          throw new Error('Level "' + this.level.id + '" references unknown zombie "' + spawn.typeId + '".');
        }
      }
    }
    this.maxLoadoutSize = options.maxLoadoutSize ?? this.registry.plants.size;
    if (!Number.isInteger(this.maxLoadoutSize) || this.maxLoadoutSize < 1) throw new Error('maxLoadoutSize must be a positive integer.');
    const allowedPlantIds = [...new Set(options.allowedPlantIds ?? [...this.registry.plants.keys()])];
    if (allowedPlantIds.length === 0 || allowedPlantIds.length > this.maxLoadoutSize
      || allowedPlantIds.some((plantId) => !this.registry.plants.has(plantId))) {
      throw new Error('allowedPlantIds must contain known plants within maxLoadoutSize.');
    }
    this.state = {
      phase: 'ready',
      tick: 0,
      sun: this.level.startingSun,
      selectedPlantId: null,
      allowedPlantIds,
      plants: [],
      graves: structuredClone(this.level.graves ?? []),
      zombies: [],
      projectiles: [],
      suns: [],
      mowers: (this.level.mowerRows ?? Array.from({ length: this.level.rows }, (_, row) => row))
        .map((row): MowerEntity => ({ row, x: -0.25, active: false, used: false })),
      spawnedWaveCount: 0,
      lastSkySunTick: 0,
      nextWaveEarliestTick: 0,
      waitingForNextWave: false,
      plantCooldowns: new Map(),
    };
  }

  dispatch(command: GameCommand): CommandResult {
    switch (command.type) {
      case 'START':
        if (this.state.phase !== 'ready') return { accepted: false, reason: 'not-playing' };
        this.state.phase = 'playing';
        this.emit({ type: 'game-started', tick: this.state.tick });
        return { accepted: true };
      case 'PAUSE':
        if (this.state.phase !== 'playing') return { accepted: false, reason: 'not-playing' };
        this.state.phase = 'paused';
        return { accepted: true };
      case 'RESUME':
        if (this.state.phase !== 'paused') return { accepted: false, reason: 'not-playing' };
        this.state.phase = 'playing';
        return { accepted: true };
      case 'SELECT_PLANT':
        if (this.state.phase !== 'playing') return { accepted: false, reason: 'not-playing' };
        if (!this.registry.plants.has(command.plantId)) return { accepted: false, reason: 'unknown-plant' };
        if (!this.state.allowedPlantIds.includes(command.plantId)) return { accepted: false, reason: 'plant-not-in-loadout' };
        this.state.selectedPlantId = command.plantId;
        return { accepted: true };
      case 'PLANT':
        return this.plant(command.row, command.column);
      case 'SHOVEL':
        return this.shovel(command.row, command.column);
      case 'COLLECT_SUN':
        return this.collectSun(command.sunId);
      case 'SET_LOADOUT':
        if (this.state.phase !== 'intermission') return { accepted: false, reason: 'not-intermission' };
        if (command.plantIds.length < 1 || command.plantIds.length > this.maxLoadoutSize
          || new Set(command.plantIds).size !== command.plantIds.length
          || command.plantIds.some((plantId) => !this.registry.plants.has(plantId))) {
          return { accepted: false, reason: 'invalid-loadout' };
        }
        this.state.allowedPlantIds = [...command.plantIds];
        if (this.state.selectedPlantId && !this.state.allowedPlantIds.includes(this.state.selectedPlantId)) this.state.selectedPlantId = null;
        return { accepted: true };
      case 'CONTINUE':
        if (this.state.phase !== 'intermission') return { accepted: false, reason: 'not-intermission' };
        if (this.level.survivalWavePlan?.difficulty === 'endless' && this.state.spawnedWaveCount === this.level.waves.length) {
          const stageIndex = Math.floor(this.state.spawnedWaveCount / this.level.survivalWavePlan.wavesPerStage);
          this.level.waves.push(...createSurvivalStageWaves(
            this.level.survivalWavePlan,
            stageIndex,
            this.seed,
            this.level.rows,
            this.registry.zombies,
          ));
        }
        this.state.phase = 'playing';
        this.state.nextWaveEarliestTick = this.state.tick + (this.level.endlessWaveRule?.startDelayTicks ?? this.level.waveStartDelayTicks ?? 1);
        this.state.waitingForNextWave = true;
        return { accepted: true };
    }
  }

  step(ticks = 1): void {
    if (!Number.isInteger(ticks) || ticks < 0) throw new Error('ticks must be a non-negative integer.');
    for (let index = 0; index < ticks && this.state.phase === 'playing'; index += 1) {
      this.state.tick += 1;
      this.processWaves();
      this.processSun();
      this.processPlants();
      this.processProjectiles();
      this.processZombies();
      this.processMowers();
      this.removeDeadZombies();
      this.expireSuns();
      this.resolveEndState();
    }
  }

  getSnapshot(): GameSnapshot {
    return cloneSnapshot(this.level, this.state, this.registry);
  }

  getMetrics(): GameMetrics {
    return {
      seed: this.seed,
      ticks: this.state.tick,
      sunSpent: this.sunSpent,
      sunCollected: this.sunCollected,
      plantsPlanted: this.plantsPlanted,
      zombiesSpawned: this.zombiesSpawned,
      zombiesKilled: this.zombiesKilled,
      mowersUsed: this.mowersUsed,
      phase: this.state.phase,
    };
  }

  drainEvents(): GameEvent[] {
    return this.eventQueue.splice(0, this.eventQueue.length);
  }

  private nextId(kind: string): string {
    this.sequence += 1;
    return kind + '-' + this.sequence.toString(36);
  }

  private spawnZombie(typeId: string, row: number, x: number): ZombieEntity {
    const definition = this.registry.zombies.get(typeId);
    if (!definition) throw new Error('Unknown zombie type: ' + typeId);
    const zombie: ZombieEntity = {
      id: this.nextId('zombie'),
      typeId,
      row,
      x,
      health: definition.maxHealth,
      maxHealth: definition.maxHealth,
      armorHealth: definition.armorHealth ?? 0,
      maxArmorHealth: definition.armorHealth ?? 0,
      nextBiteTick: this.state.tick,
      slowUntilTick: 0,
      hasJumped: false,
      team: 'zombies',
      frozenUntilTick: 0,
      stunnedUntilTick: 0,
      isBurrowed: definition.behavior === 'burrow',
      movingRight: false,
      didThrowImp: false,
      nextJumpTick: 0,
      nextSummonTick: definition.behavior === 'dancer' ? this.state.tick + 90 : 0,
      hasSummonedBackup: false,
    };
    this.state.zombies.push(zombie);
    this.zombiesSpawned += 1;
    this.emit({ type: 'zombie-spawned', tick: this.state.tick, zombieId: zombie.id, typeId, row });
    return zombie;
  }

  private emit(event: GameEvent): void {
    this.eventQueue.push(structuredClone(event));
    for (const entry of this.registry.eventHooks.get(event.type) ?? []) {
      entry.hook(structuredClone(event), this.getSnapshot());
    }
  }

  private plant(row: number, column: number): CommandResult {
    if (this.state.phase !== 'playing') return { accepted: false, reason: 'not-playing' };
    if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || row >= this.level.rows || column < 0 || column >= this.level.columns) {
      return { accepted: false, reason: 'invalid-cell' };
    }
    const plantId = this.state.selectedPlantId;
    if (!plantId) return { accepted: false, reason: 'no-plant-selected' };
    const definition = this.registry.plants.get(plantId);
    if (!definition) return { accepted: false, reason: 'unknown-plant' };
    const occupants = this.state.plants.filter((plant) => plant.row === row && plant.column === column);
    const slot = definition.slot ?? 'base';
    const requiredPlant = definition.requiredPlantId
      ? occupants.find((plant) => plant.typeId === definition.requiredPlantId)
      : undefined;
    if (definition.requiredPlantId && !requiredPlant) return { accepted: false, reason: 'needs-upgrade-target' };
    if (occupants.some((plant) => plant.slot === slot && plant !== requiredPlant)) return { accepted: false, reason: 'occupied' };
    const plantingReason = this.plantingConstraint(definition, slot, row, column, occupants);
    if (plantingReason) return { accepted: false, reason: plantingReason };
    for (const entry of this.registry.plantingRules) {
      const reason = entry.rule({ plant: definition, levelId: this.level.id, row, column });
      if (reason) return { accepted: false, reason };
    }
    const nextReadyTick = this.state.plantCooldowns.get(plantId) ?? 0;
    if (this.state.tick < nextReadyTick) return { accepted: false, reason: 'on-cooldown' };
    let cost = definition.cost;
    for (const entry of this.registry.plantCostRules) {
      const adjustedCost = entry.rule({ baseCost: cost, plant: definition, levelId: this.level.id, tick: this.state.tick });
      if (!Number.isFinite(adjustedCost) || adjustedCost < 0) throw new Error('Plant cost rule ' + entry.id + ' returned an invalid cost.');
      cost = adjustedCost;
    }
    cost = Math.max(0, Math.round(cost));
    if (this.state.sun < cost) return { accepted: false, reason: 'insufficient-sun' };

    const plant: PlantEntity = {
      id: this.nextId('plant'),
      typeId: plantId,
      row,
      column,
      health: definition.maxHealth,
      nextActionTick: this.state.tick + this.actionInterval(definition),
      slot: definition.slot ?? 'base',
      isAsleep: (this.level.terrain ?? 'day') === 'day' && definition.id.endsWith('shroom'),
    };
    this.state.sun -= cost;
    this.sunSpent += cost;
    this.plantsPlanted += 1;
    this.state.plantCooldowns.set(plantId, this.state.tick + definition.cooldownTicks);
    if (requiredPlant && definition.consumesRequiredPlant) {
      this.state.plants = this.state.plants.filter((occupant) => occupant !== requiredPlant);
      this.emit({ type: 'plant-removed', tick: this.state.tick, plantId: requiredPlant.typeId, row, column });
    }
    this.state.plants.push(plant);
    this.emit({ type: 'plant-placed', tick: this.state.tick, plantId, row, column });
    if (definition.ability === 'wake') {
      for (const occupant of occupants) if (occupant.slot === 'base') occupant.isAsleep = false;
      plant.health = 0;
      this.removeDeadPlants();
    }
    return { accepted: true };
  }

  private shovel(row: number, column: number): CommandResult {
    if (this.state.phase !== 'playing') return { accepted: false, reason: 'not-playing' };
    const priority = { overlay: 0, base: 1, platform: 2 } as const;
    const index = this.state.plants
      .map((plant, plantIndex) => ({ plant, plantIndex }))
      .filter(({ plant }) => plant.row === row && plant.column === column)
      .sort((left, right) => priority[left.plant.slot] - priority[right.plant.slot])[0]?.plantIndex ?? -1;
    if (index < 0) return { accepted: false, reason: 'empty-cell' };
    const [plant] = this.state.plants.splice(index, 1);
    if (!plant) return { accepted: false, reason: 'empty-cell' };
    this.emit({ type: 'plant-removed', tick: this.state.tick, plantId: plant.typeId, row, column });
    return { accepted: true };
  }

  private collectSun(sunId: string): CommandResult {
    if (this.state.phase !== 'playing') return { accepted: false, reason: 'not-playing' };
    const index = this.state.suns.findIndex((sun) => sun.id === sunId);
    if (index < 0) return { accepted: false, reason: 'unknown-sun' };
    const [sun] = this.state.suns.splice(index, 1);
    if (!sun) return { accepted: false, reason: 'unknown-sun' };
    this.state.sun += sun.value;
    this.sunCollected += sun.value;
    this.emit({ type: 'sun-collected', tick: this.state.tick, sunId, value: sun.value });
    return { accepted: true };
  }

  private actionInterval(plant: PlantDefinition): number {
    if (['clear-air', 'explode-lane', 'freeze-all', 'wake'].includes(plant.ability ?? '')) return 1;
    if (plant.ability === 'destroy-grave') return 180;
    if (plant.ability === 'hypnotize') return 1;
    if (plant.ability === 'strip-armor') return 120;
    if (plant.behavior === 'sunflower') return plant.sunIntervalTicks ?? 720;
    if (this.isShooter(plant)) return plant.attackIntervalTicks ?? 90;
    if (plant.behavior === 'mine') return plant.armTicks ?? 600;
    if (plant.behavior === 'bomb' || plant.behavior === 'spike') return plant.attackIntervalTicks ?? 30;
    if (plant.behavior === 'eater') return plant.attackIntervalTicks ?? 900;
    return Number.MAX_SAFE_INTEGER;
  }

  private plantingConstraint(
    definition: PlantDefinition,
    slot: PlantEntity['slot'],
    row: number,
    column: number,
    occupants: PlantEntity[],
  ): string | null {
    const hasGrave = this.state.graves.some((grave) => grave.row === row && grave.column === column);
    if (hasGrave && definition.ability !== 'destroy-grave') return 'grave-blocks';
    if (definition.ability === 'destroy-grave' && !hasGrave) return 'no-grave';
    const waterRows = this.level.waterRows ?? (this.level.terrain === 'pool' || this.level.terrain === 'fog' ? [2, 3] : []);
    const onWater = waterRows.includes(row);
    const onRoof = this.level.terrain === 'roof' || this.level.terrain === 'boss';
    const surface = onWater ? 'water' : onRoof ? 'roof' : 'land';
    const allowedSurface = definition.plantableOn ?? 'land';
    const hasPlatform = (kind: 'water' | 'roof') => occupants.some((plant) => {
      if (plant.slot !== 'platform') return false;
      const plantSurface = this.registry.plants.get(plant.typeId)?.plantableOn;
      return plantSurface === kind || plantSurface === 'any';
    });

    if (allowedSurface !== 'any' && allowedSurface !== surface && slot === 'platform') return 'wrong-terrain';
    if (allowedSurface === 'water' && !onWater) return 'wrong-terrain';
    if (allowedSurface === 'roof' && !onRoof) return 'wrong-terrain';
    if (allowedSurface === 'land' && (onWater || onRoof) && slot !== 'platform') {
      if (onWater && !hasPlatform('water')) return 'needs-platform';
      if (onRoof && !hasPlatform('roof')) return 'needs-platform';
    }
    if (slot === 'overlay' && !occupants.some((plant) => plant.slot === 'base')) return 'needs-base-plant';
    if (definition.requiredPlantId && !occupants.some((plant) => plant.typeId === definition.requiredPlantId)) return 'needs-upgrade-target';
    if (definition.ability === 'wake' && !occupants.some((plant) => plant.slot === 'base' && plant.isAsleep)) return 'no-sleeping-mushroom';
    return null;
  }

  private processWaves(): void {
    while (this.state.spawnedWaveCount < this.level.waves.length) {
      const wave = this.level.waves[this.state.spawnedWaveCount];
      if (!wave) break;
      if (this.level.survivalWavePlan && this.state.spawnedWaveCount > 0 && this.state.tick < this.state.nextWaveEarliestTick) break;
      if (this.level.intermissionAfterWaves && this.state.spawnedWaveCount > 0 && this.state.tick < this.state.nextWaveEarliestTick) break;
      if (wave.atTick > this.state.tick) break;
      for (const spawn of wave.zombies) {
        const count = Math.max(1, Math.floor(spawn.count ?? 1));
        for (let index = 0; index < count; index += 1) {
          const [minRow, maxRow] = spawn.rowRange ?? [0, this.level.rows - 1];
          const row = spawn.row ?? minRow + Math.floor(this.random() * (maxRow - minRow + 1));
          this.spawnZombie(spawn.typeId, row, this.level.columns - 0.25);
        }
      }
      this.state.spawnedWaveCount += 1;
      this.state.waitingForNextWave = false;
      if (this.level.survivalWavePlan) this.state.nextWaveEarliestTick = this.state.tick + (this.level.waveStartDelayTicks ?? 1);
      this.emit({ type: 'wave-started', tick: this.state.tick, waveNumber: this.state.spawnedWaveCount });
    }
  }

  private processSun(): void {
    if (this.level.skySunEveryTicks > 0 && this.state.tick - this.state.lastSkySunTick >= this.level.skySunEveryTicks) {
      this.state.lastSkySunTick = this.state.tick;
      this.createSun(25);
    }
    for (const plant of this.state.plants) {
      const definition = this.registry.plants.get(plant.typeId);
      if (definition?.behavior !== 'sunflower' || plant.isAsleep || this.state.tick < plant.nextActionTick) continue;
      this.createSun(definition.sunValue ?? 25);
      plant.nextActionTick += definition.sunIntervalTicks ?? 720;
    }
  }

  private createSun(value: number): void {
    const sun: SunEntity = { id: this.nextId('sun'), value, expiresAtTick: this.state.tick + 1_200 };
    this.state.suns.push(sun);
    this.emit({ type: 'sun-created', tick: this.state.tick, sunId: sun.id, value });
  }

  private processPlants(): void {
    for (const plant of this.state.plants) {
      const definition = this.registry.plants.get(plant.typeId);
      if (!definition || plant.isAsleep || this.state.tick < plant.nextActionTick) continue;
      if (this.processPlantAbility(plant, definition)) continue;
      if (this.isShooter(definition)) {
        for (const rowOffset of definition.attackRows ?? [0]) {
          const row = plant.row + rowOffset;
          if (row < 0 || row >= this.level.rows) continue;
          const target = this.state.zombies
            .filter((zombie) => zombie.health > 0 && zombie.team === 'zombies' && zombie.row === row && zombie.x >= plant.column + 0.25
              && (definition.ability === 'anti-air' || this.registry.zombies.get(zombie.typeId)?.behavior !== 'balloon'))
            .sort((left, right) => left.x - right.x)[0];
          const backwardTarget = definition.shootsBackwards
            ? this.state.zombies
              .filter((zombie) => zombie.health > 0 && zombie.team === 'zombies' && zombie.row === row && zombie.x <= plant.column - 0.25
                && (definition.ability === 'anti-air' || this.registry.zombies.get(zombie.typeId)?.behavior !== 'balloon'))
              .sort((left, right) => right.x - left.x)[0]
            : undefined;
          if (!target && !backwardTarget) continue;
          const shootingBackwards = !target && Boolean(backwardTarget);
          const projectileCount = definition.behavior === 'multi-shooter' ? definition.projectilesPerAttack ?? 2 : 1;
          for (let index = 0; index < projectileCount; index += 1) {
            this.state.projectiles.push({
              id: this.nextId('pea'),
              row,
              x: plant.column + 0.55,
              damage: definition.damage ?? 20,
              slowTicks: definition.slowTicks ?? 0,
              speedPerTick: (definition.projectileSpeed ?? 0.09) * (shootingBackwards ? -1 : 1),
              areaRadius: definition.behavior === 'area-shooter' ? definition.blastRadius ?? 0.7 : 0,
              piercing: definition.ability === 'piercing',
              canHitAir: definition.ability === 'anti-air',
              stunTicks: 0,
              isIgnited: false,
            });
          }
        }
        plant.nextActionTick = this.state.tick + (definition.attackIntervalTicks ?? 90);
      } else if (definition.behavior === 'bomb') {
        const radius = definition.blastRadius ?? 1.4;
        for (const zombie of [...this.state.zombies]) {
          if (zombie.team !== 'zombies') continue;
          const rowDistance = Math.abs(zombie.row - plant.row);
          const columnDistance = Math.abs(zombie.x - plant.column);
          if (rowDistance * rowDistance + columnDistance * columnDistance <= radius * radius) {
            this.applyDamage(zombie, definition.damage ?? 1_800, definition.slowTicks ?? 0);
          }
        }
        plant.health = 0;
      } else if (definition.behavior === 'mine') {
        const target = this.state.zombies.find((zombie) => zombie.team === 'zombies' && zombie.row === plant.row && zombie.x <= plant.column + (definition.attackRange ?? 0.75));
        if (target) {
          for (const zombie of [...this.state.zombies]) {
            if (zombie.team !== 'zombies') continue;
            const rowDistance = Math.abs(zombie.row - plant.row);
            const columnDistance = Math.abs(zombie.x - plant.column);
            if (rowDistance * rowDistance + columnDistance * columnDistance <= (definition.blastRadius ?? 1.2) ** 2) {
              this.applyDamage(zombie, definition.damage ?? 1_800);
            }
          }
          plant.health = 0;
        } else {
          plant.nextActionTick = this.state.tick + (definition.attackIntervalTicks ?? 30);
        }
      } else if (definition.behavior === 'eater') {
        const target = this.state.zombies
          .filter((zombie) => zombie.health > 0 && zombie.team === 'zombies' && zombie.row === plant.row && zombie.x <= plant.column + (definition.attackRange ?? 1.2))
          .sort((left, right) => left.x - right.x)[0];
        if (target) {
          this.applyDamage(target, definition.damage ?? 1_800);
          plant.nextActionTick = this.state.tick + (definition.attackIntervalTicks ?? 900);
          if (definition.consumesOnAttack) plant.health = 0;
        }
      } else if (definition.behavior === 'spike') {
        for (const zombie of [...this.state.zombies]) {
          if (zombie.team === 'zombies' && zombie.row === plant.row && Math.abs(zombie.x - plant.column) <= 0.6) this.applyDamage(zombie, definition.damage ?? 20);
        }
        plant.nextActionTick = this.state.tick + (definition.attackIntervalTicks ?? 30);
      }
    }
    this.removeDeadPlants();
  }

  private processPlantAbility(plant: PlantEntity, definition: PlantDefinition): boolean {
    switch (definition.ability) {
      case 'freeze-all':
        for (const zombie of [...this.state.zombies]) {
          if (zombie.team === 'zombies') zombie.frozenUntilTick = Math.max(zombie.frozenUntilTick, this.state.tick + (definition.slowTicks ?? 900));
        }
        plant.health = 0;
        return true;
      case 'clear-air':
        for (const zombie of [...this.state.zombies]) {
          if (zombie.team === 'zombies' && this.registry.zombies.get(zombie.typeId)?.behavior === 'balloon') zombie.health = 0;
        }
        plant.health = 0;
        return true;
      case 'explode-lane':
        for (const zombie of this.state.zombies) {
          if (zombie.team === 'zombies' && zombie.row === plant.row) this.applyDamage(zombie, definition.damage ?? 1_800);
        }
        plant.health = 0;
        return true;
      case 'hypnotize': {
        const target = this.state.zombies
          .filter((zombie) => zombie.team === 'zombies' && zombie.health > 0 && zombie.row === plant.row && zombie.x <= plant.column + (definition.attackRange ?? 1.2))
          .sort((left, right) => left.x - right.x)[0];
        if (target) {
          target.team = 'plants';
          plant.health = 0;
        } else {
          plant.nextActionTick = this.state.tick + 30;
        }
        return true;
      }
      case 'strip-armor': {
        const targets = this.state.zombies.filter((zombie) => zombie.team === 'zombies'
          && zombie.armorHealth > 0
          && Math.abs(zombie.x - plant.column) <= 3.5
          && Math.abs(zombie.row - plant.row) <= 1);
        for (const zombie of targets) zombie.armorHealth = 0;
        plant.nextActionTick = this.state.tick + 180;
        return true;
      }
      case 'destroy-grave': {
        const index = this.state.graves.findIndex((grave) => grave.row === plant.row && grave.column === plant.column);
        if (index >= 0) this.state.graves.splice(index, 1);
        plant.health = 0;
        return true;
      }
      default:
        return false;
    }
  }

  private processProjectiles(): void {
    const remaining: ProjectileEntity[] = [];
    for (const projectile of this.state.projectiles) {
      const previousX = projectile.x;
      projectile.x += projectile.speedPerTick;
      if (!projectile.isIgnited && this.state.plants.some((plant) => plant.row === projectile.row
        && plant.column >= Math.min(previousX, projectile.x) && plant.column < Math.max(previousX, projectile.x)
        && this.registry.plants.get(plant.typeId)?.ability === 'ignite-projectiles')) {
        projectile.damage *= 2;
        projectile.isIgnited = true;
      }
      const target = this.state.zombies
        .filter((zombie) => zombie.health > 0 && zombie.team === 'zombies' && !zombie.isBurrowed && zombie.row === projectile.row
          && (projectile.canHitAir || this.registry.zombies.get(zombie.typeId)?.behavior !== 'balloon')
          && zombie.x >= Math.min(previousX, projectile.x) - 0.2 && zombie.x <= Math.max(previousX, projectile.x) + 0.2)
        .sort((left, right) => (projectile.speedPerTick < 0 ? right.x - left.x : left.x - right.x))[0];
      if (target) {
        this.applyDamage(target, projectile.damage, projectile.slowTicks);
        target.stunnedUntilTick = Math.max(target.stunnedUntilTick, this.state.tick + projectile.stunTicks);
        if (projectile.areaRadius > 0) {
          for (const zombie of [...this.state.zombies]) {
            if (zombie.id === target.id || zombie.team !== 'zombies' || zombie.row !== target.row || Math.abs(zombie.x - target.x) > projectile.areaRadius) continue;
            this.applyDamage(zombie, projectile.damage, projectile.slowTicks);
          }
        }
      }
      if ((!target || projectile.piercing)
        && (projectile.speedPerTick < 0 ? projectile.x > -0.5 : projectile.x < this.level.columns + 0.5)) {
        remaining.push(projectile);
      }
    }
    this.state.projectiles = remaining;
  }

  private processZombies(): void {
    for (const zombie of [...this.state.zombies]) {
      if (zombie.health <= 0) continue;
      const definition = this.registry.zombies.get(zombie.typeId);
      if (!definition) continue;
      if (zombie.frozenUntilTick > this.state.tick || zombie.stunnedUntilTick > this.state.tick) continue;
      if (definition.behavior === 'dancer' && !zombie.hasSummonedBackup && this.state.tick >= zombie.nextSummonTick) {
        zombie.hasSummonedBackup = true;
        const backupPositions = [
          { row: zombie.row - 1, x: zombie.x },
          { row: zombie.row + 1, x: zombie.x },
          { row: zombie.row, x: zombie.x - 0.5 },
          { row: zombie.row, x: zombie.x + 0.5 },
        ];
        for (const backup of backupPositions) {
          if (backup.row >= 0 && backup.row < this.level.rows) this.spawnZombie('backup-dancer', backup.row, backup.x);
        }
      }
      if (definition.behavior === 'burrow' && zombie.isBurrowed) {
        zombie.x -= definition.speedPerTick;
        if (zombie.x < -0.4) {
          zombie.isBurrowed = false;
          zombie.movingRight = true;
          zombie.x = 0.15;
        }
        continue;
      }
      if (zombie.team === 'plants') {
        const target = this.state.zombies
          .filter((candidate) => candidate.health > 0 && candidate.team === 'zombies' && candidate.row === zombie.row && candidate.x > zombie.x)
          .sort((left, right) => left.x - right.x)[0];
        if (target && target.x - zombie.x <= 0.65 && this.state.tick >= zombie.nextBiteTick) {
          this.applyDamage(target, definition.biteDamage);
          zombie.nextBiteTick = this.state.tick + definition.biteIntervalTicks;
        } else {
          zombie.x += definition.speedPerTick;
          if (zombie.x > this.level.columns + 0.6) zombie.health = 0;
        }
        continue;
      }
      const blockingPlant = this.state.plants
        .filter((plant) => definition.behavior !== 'balloon' && plant.row === zombie.row && zombie.x <= plant.column + 0.85 && zombie.x >= plant.column - 0.25)
        .sort((left, right) => right.column - left.column
          || ({ overlay: 0, base: 1, platform: 2 }[left.slot] - { overlay: 0, base: 1, platform: 2 }[right.slot]))[0];
      if (blockingPlant) {
        if (definition.behavior === 'pole-vault' && !zombie.hasJumped) {
          zombie.x = blockingPlant.column - 0.3;
          zombie.hasJumped = true;
          zombie.nextBiteTick = this.state.tick + definition.biteIntervalTicks;
          continue;
        }
        if (definition.behavior === 'jumper'
          && (!definition.jumpIntervalTicks ? !zombie.hasJumped : this.state.tick >= zombie.nextJumpTick)) {
          zombie.x = blockingPlant.column - 0.3;
          zombie.hasJumped = true;
          zombie.nextJumpTick = this.state.tick + (definition.jumpIntervalTicks ?? Number.MAX_SAFE_INTEGER);
          zombie.nextBiteTick = this.state.tick + definition.biteIntervalTicks;
          continue;
        }
        if (this.state.tick >= zombie.nextBiteTick) {
          if (this.registry.plants.get(blockingPlant.typeId)?.ability === 'redirect' && this.level.rows > 1) {
            zombie.row = zombie.row < this.level.rows - 1 ? zombie.row + 1 : zombie.row - 1;
            zombie.x = blockingPlant.column - 0.3;
            zombie.nextBiteTick = this.state.tick + definition.biteIntervalTicks;
            continue;
          }
          blockingPlant.health -= definition.biteDamage;
          zombie.nextBiteTick = this.state.tick + definition.biteIntervalTicks;
          this.removeDeadPlants();
        }
        continue;
      }
      const speedFactor = zombie.slowUntilTick > this.state.tick ? 0.5 : 1;
      zombie.x += (zombie.movingRight ? 1 : -1) * definition.speedPerTick * speedFactor;
      if (!zombie.movingRight && zombie.x < -0.4) {
        const mower = this.state.mowers.find((candidate) => candidate.row === zombie.row && !candidate.used);
        if (mower) {
          mower.used = true;
          mower.active = true;
          mower.x = -0.25;
          this.mowersUsed += 1;
          this.emit({ type: 'mower-activated', tick: this.state.tick, row: zombie.row });
        } else if (this.state.mowers.some((candidate) => candidate.row === zombie.row && candidate.active)) {
          continue;
        } else {
          this.end('lost');
          return;
        }
      } else if (zombie.movingRight && zombie.x > this.level.columns + 0.5) {
        zombie.health = 0;
      }
    }
  }

  private processMowers(): void {
    for (const mower of this.state.mowers) {
      if (!mower.active) continue;
      mower.x += 0.2;
      for (const zombie of this.state.zombies) {
        if (zombie.team === 'zombies' && zombie.row === mower.row && zombie.x <= mower.x + 0.7) zombie.health = 0;
      }
      if (mower.x > this.level.columns + 0.5) mower.active = false;
    }
  }

  private removeDeadPlants(): void {
    const living: PlantEntity[] = [];
    for (const plant of this.state.plants) if (plant.health > 0) living.push(plant);
    const removed = this.state.plants.filter((plant) => plant.health <= 0);
    this.state.plants = living;
    for (const plant of removed) {
      this.emit({ type: 'plant-removed', tick: this.state.tick, plantId: plant.typeId, row: plant.row, column: plant.column });
    }
  }

  private removeDeadZombies(): void {
    const living: ZombieEntity[] = [];
    for (const zombie of this.state.zombies) {
      if (zombie.health > 0) {
        living.push(zombie);
      }
    }
    const killed = this.state.zombies.filter((zombie) => zombie.health <= 0);
    this.state.zombies = living;
    this.zombiesKilled += killed.filter((zombie) => zombie.team === 'zombies').length;
    for (const zombie of killed) {
      this.emit({ type: 'zombie-killed', tick: this.state.tick, zombieId: zombie.id, typeId: zombie.typeId });
    }
  }

  private expireSuns(): void {
    this.state.suns = this.state.suns.filter((sun) => sun.expiresAtTick > this.state.tick);
  }

  private isShooter(definition: PlantDefinition): boolean {
    return ['shooter', 'slow-shooter', 'multi-shooter', 'multi-lane-shooter', 'area-shooter', 'catapult'].includes(definition.behavior);
  }

  private applyDamage(zombie: ZombieEntity, damage: number, slowTicks = 0): void {
    if (zombie.armorHealth > 0) {
      const absorbed = Math.min(zombie.armorHealth, damage);
      zombie.armorHealth -= absorbed;
      damage -= absorbed;
    }
    zombie.health -= damage;
    zombie.slowUntilTick = Math.max(zombie.slowUntilTick, this.state.tick + slowTicks);
    if (zombie.typeId === 'gargantuar' && !zombie.didThrowImp && zombie.health > 0 && zombie.health <= zombie.maxHealth * 0.5) {
      zombie.didThrowImp = true;
      const definition = this.registry.zombies.get('imp');
      if (definition) {
        this.spawnZombie('imp', zombie.row, zombie.x + 0.5);
      }
    }
  }

  private resolveEndState(): void {
    if (this.state.phase !== 'playing') return;
    if (this.state.zombies.some((zombie) => zombie.team === 'zombies') || this.state.spawnedWaveCount === 0) return;
    if (this.state.waitingForNextWave) return;
    if (this.level.endlessWaveRule && this.state.spawnedWaveCount === this.level.waves.length) this.appendEndlessWave();
    const endlessSurvival = this.level.survivalWavePlan?.difficulty === 'endless';
    const hasNextStage = endlessSurvival && this.state.spawnedWaveCount === this.level.waves.length;
    const hasMoreWaves = this.state.spawnedWaveCount < this.level.waves.length || Boolean(this.level.endlessWaveRule) || hasNextStage;
    const intermissionInterval = this.level.intermissionEveryWaves ?? 1;
    if (this.level.intermissionAfterWaves && this.state.spawnedWaveCount > 0
      && hasMoreWaves && this.state.spawnedWaveCount % intermissionInterval === 0) {
      this.state.phase = 'intermission';
      this.emit({ type: 'wave-intermission', tick: this.state.tick, nextWaveNumber: this.state.spawnedWaveCount + 1 });
      return;
    }
    if (this.state.spawnedWaveCount === this.level.waves.length && !endlessSurvival && !this.level.endlessWaveRule) this.end('won');
  }

  private appendEndlessWave(): void {
    const rule = this.level.endlessWaveRule;
    if (!rule || rule.zombiePool.length === 0) return;
    const typeId = rule.zombiePool[Math.floor(this.random() * rule.zombiePool.length)];
    if (!typeId || !this.registry.zombies.has(typeId)) throw new Error('Endless wave references unknown zombie: ' + typeId);
    const completedWaves = this.state.spawnedWaveCount;
    const count = rule.baseCount + Math.floor(completedWaves / rule.countEveryWaves);
    this.level.waves.push({
      atTick: this.state.tick + 1,
      zombies: [{ typeId, count, rowRange: [0, this.level.rows - 1] }],
    });
  }

  private end(outcome: 'won' | 'lost'): void {
    if (this.state.phase !== 'playing') return;
    this.state.phase = outcome;
    this.emit({ type: 'game-ended', tick: this.state.tick, outcome });
  }
}

export function createGame(options: GameOptions = {}): GameRuntime {
  return new GameRuntime(options);
}

export function dispatchCommand(game: GameRuntime, command: GameCommand): CommandResult {
  return game.dispatch(command);
}

export function step(game: GameRuntime, ticks = 1): void {
  game.step(ticks);
}

export function getSnapshot(game: GameRuntime): GameSnapshot {
  return game.getSnapshot();
}

export function getMetrics(game: GameRuntime): GameMetrics {
  return game.getMetrics();
}

export function drainEvents(game: GameRuntime): GameEvent[] {
  return game.drainEvents();
}
