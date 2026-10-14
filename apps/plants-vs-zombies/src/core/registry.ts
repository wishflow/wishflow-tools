import { ADVENTURE_LEVELS, PLANTS, ZOMBIES } from '../content/base';
import type { GameEvent, GameSnapshot, LevelDefinition, PlantDefinition, ZombieDefinition } from './types';

export type PlantingRule = (context: {
  plant: PlantDefinition;
  levelId: string;
  row: number;
  column: number;
}) => string | null;

export type PlantCostRule = (context: {
  baseCost: number;
  plant: PlantDefinition;
  levelId: string;
  tick: number;
}) => number;

export type GameEventHook = (event: GameEvent, snapshot: GameSnapshot) => void;

export interface GamePlugin {
  id: string;
  apiVersion: 1;
  register(registry: GameRegistry): void;
}

export interface GameRegistry {
  plants: Map<string, PlantDefinition>;
  zombies: Map<string, ZombieDefinition>;
  levels: Map<string, LevelDefinition>;
  plugins: Set<string>;
  plantingRules: Array<{ id: string; rule: PlantingRule }>;
  plantCostRules: Array<{ id: string; rule: PlantCostRule }>;
  eventHooks: Map<GameEvent['type'], Array<{ id: string; hook: GameEventHook }>>;
}

export function createRegistry(): GameRegistry {
  return {
    plants: new Map(),
    zombies: new Map(),
    levels: new Map(),
    plugins: new Set(),
    plantingRules: [],
    plantCostRules: [],
    eventHooks: new Map(),
  };
}

function validateId(id: string, kind: string): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(kind + ' id must be a lowercase stable id: ' + id);
}

export function registerPlant(registry: GameRegistry, definition: PlantDefinition): void {
  validateId(definition.id, 'Plant');
  if (registry.plants.has(definition.id)) throw new Error('Plant \"' + definition.id + '\" is already registered.');
  if (!Number.isFinite(definition.cost) || definition.cost < 0) throw new Error('Plant \"' + definition.id + '\" cost must be non-negative.');
  if (!Number.isFinite(definition.maxHealth) || definition.maxHealth <= 0) throw new Error('Plant \"' + definition.id + '\" maxHealth must be positive.');
  if (!Number.isInteger(definition.cooldownTicks) || definition.cooldownTicks < 0) throw new Error('Plant \"' + definition.id + '\" cooldownTicks must be a non-negative integer.');
  if (definition.slot && !['platform', 'base', 'overlay'].includes(definition.slot)) throw new Error('Plant \"' + definition.id + '\" has an unknown board slot.');
  if (definition.plantableOn && !['land', 'water', 'roof', 'any'].includes(definition.plantableOn)) throw new Error('Plant \"' + definition.id + '\" has an unknown planting surface.');
  if (definition.slot === 'platform' && definition.plantableOn !== 'water' && definition.plantableOn !== 'roof') {
    throw new Error('Plant \"' + definition.id + '\" platform slot requires a water or roof surface.');
  }
  const abilities = ['anti-air', 'clear-air', 'destroy-grave', 'explode-lane', 'freeze-all', 'hypnotize', 'ignite-projectiles', 'piercing', 'redirect', 'reveal-fog', 'strip-armor', 'wake'];
  if (definition.ability && !abilities.includes(definition.ability)) throw new Error('Plant \"' + definition.id + '\" has an unknown ability.');
  const shooterBehaviors = ['shooter', 'slow-shooter', 'multi-shooter', 'multi-lane-shooter', 'area-shooter', 'catapult'];
  if (shooterBehaviors.includes(definition.behavior) && (!definition.damage || !definition.attackIntervalTicks || !definition.projectileSpeed)) {
    throw new Error('Plant \"' + definition.id + '\" shooter behavior requires damage, attackIntervalTicks, and projectileSpeed.');
  }
  if (definition.behavior === 'sunflower' && definition.sunIntervalTicks !== undefined && (!Number.isInteger(definition.sunIntervalTicks) || definition.sunIntervalTicks <= 0)) {
    throw new Error('Plant ' + definition.id + ' sunIntervalTicks must be positive.');
  }
  if (definition.behavior === 'mine' && definition.armTicks !== undefined && (!Number.isInteger(definition.armTicks) || definition.armTicks <= 0)) {
    throw new Error('Plant ' + definition.id + ' armTicks must be positive.');
  }
  if (definition.behavior === 'bomb' && definition.blastRadius !== undefined && (!Number.isFinite(definition.blastRadius) || definition.blastRadius <= 0)) {
    throw new Error('Plant ' + definition.id + ' blastRadius must be positive.');
  }
  registry.plants.set(definition.id, { ...definition });
}

export function registerZombie(registry: GameRegistry, definition: ZombieDefinition): void {
  validateId(definition.id, 'Zombie');
  if (registry.zombies.has(definition.id)) throw new Error('Zombie \"' + definition.id + '\" is already registered.');
  if (!Number.isFinite(definition.maxHealth) || definition.maxHealth <= 0) throw new Error('Zombie \"' + definition.id + '\" maxHealth must be positive.');
  if (!Number.isFinite(definition.speedPerTick) || definition.speedPerTick <= 0) throw new Error('Zombie \"' + definition.id + '\" speedPerTick must be positive.');
  if (!Number.isFinite(definition.biteDamage) || definition.biteDamage <= 0) throw new Error('Zombie \"' + definition.id + '\" biteDamage must be positive.');
  if (!Number.isInteger(definition.biteIntervalTicks) || definition.biteIntervalTicks <= 0) throw new Error('Zombie \"' + definition.id + '\" biteIntervalTicks must be positive.');
  if (definition.armorHealth !== undefined && (!Number.isFinite(definition.armorHealth) || definition.armorHealth < 0)) throw new Error('Zombie ' + definition.id + ' armorHealth must be non-negative.');
  if (definition.jumpIntervalTicks !== undefined && (!Number.isInteger(definition.jumpIntervalTicks) || definition.jumpIntervalTicks <= 0)) throw new Error('Zombie ' + definition.id + ' jumpIntervalTicks must be positive.');
  if (definition.behavior && !['walker', 'pole-vault', 'balloon', 'burrow', 'jumper', 'boss', 'carrier', 'dancer'].includes(definition.behavior)) {
    throw new Error('Zombie "' + definition.id + '" has an unknown behavior.');
  }
  registry.zombies.set(definition.id, { ...definition });
}

export function registerLevel(registry: GameRegistry, definition: LevelDefinition): void {
  validateId(definition.id, 'Level');
  if (registry.levels.has(definition.id)) throw new Error('Level \"' + definition.id + '\" is already registered.');
  if (!Number.isInteger(definition.rows) || definition.rows < 1 || definition.rows > 8) throw new Error('Level \"' + definition.id + '\" rows must be between 1 and 8.');
  if (!Number.isInteger(definition.columns) || definition.columns < 1 || definition.columns > 12) throw new Error('Level \"' + definition.id + '\" columns must be between 1 and 12.');
  if (!Number.isFinite(definition.startingSun) || definition.startingSun < 0) throw new Error('Level \"' + definition.id + '\" startingSun must be non-negative.');
  if (!Number.isFinite(definition.skySunEveryTicks) || definition.skySunEveryTicks < 0) throw new Error('Level ' + definition.id + ' skySunEveryTicks must be non-negative.');
  if (definition.waveStartDelayTicks !== undefined && (!Number.isInteger(definition.waveStartDelayTicks) || definition.waveStartDelayTicks < 1)) {
    throw new Error('Level ' + definition.id + ' waveStartDelayTicks must be a positive integer.');
  }
  if (definition.endlessWaveRule) {
    const rule = definition.endlessWaveRule;
    if (!definition.intermissionAfterWaves || rule.zombiePool.length === 0
      || !Number.isInteger(rule.baseCount) || rule.baseCount < 1
      || !Number.isInteger(rule.countEveryWaves) || rule.countEveryWaves < 1
      || !Number.isInteger(rule.startDelayTicks) || rule.startDelayTicks < 1) {
      throw new Error('Level ' + definition.id + ' has an invalid endless wave rule.');
    }
    for (const typeId of rule.zombiePool) if (!registry.zombies.has(typeId)) throw new Error('Level ' + definition.id + ' endless waves reference unknown zombie ' + typeId + '.');
  }
  if (definition.rewardPlantId && !registry.plants.has(definition.rewardPlantId)) throw new Error('Level ' + definition.id + ' references an unknown reward plant.');
  for (const row of definition.mowerRows ?? []) {
    if (!Number.isInteger(row) || row < 0 || row >= definition.rows) throw new Error('Level "' + definition.id + '" has a mower row outside the lawn.');
  }
  for (const row of definition.waterRows ?? []) {
    if (!Number.isInteger(row) || row < 0 || row >= definition.rows) throw new Error('Level "' + definition.id + '" has a water row outside the lawn.');
  }
  for (const grave of definition.graves ?? []) {
    if (!Number.isInteger(grave.row) || grave.row < 0 || grave.row >= definition.rows
      || !Number.isInteger(grave.column) || grave.column < 0 || grave.column >= definition.columns) {
      throw new Error('Level "' + definition.id + '" has a grave outside the lawn.');
    }
  }
  if (definition.waterRows?.length && definition.terrain !== 'pool' && definition.terrain !== 'fog') throw new Error('Level "' + definition.id + '" has water rows but is not a pool or fog level.');
  let previousTick = -1;
  for (const wave of definition.waves) {
    if (!Number.isInteger(wave.atTick) || wave.atTick < previousTick) throw new Error('Level \"' + definition.id + '\" waves must use ordered non-negative ticks.');
    previousTick = wave.atTick;
    for (const spawn of wave.zombies) {
      if (!registry.zombies.has(spawn.typeId)) throw new Error('Level \"' + definition.id + '\" references unknown zombie \"' + spawn.typeId + '\".');
      if (spawn.count !== undefined && (!Number.isInteger(spawn.count) || spawn.count <= 0)) throw new Error('Level ' + definition.id + ' has an invalid zombie count.');
      const rowRange = spawn.rowRange;
      if (rowRange && (!Number.isInteger(rowRange[0]) || !Number.isInteger(rowRange[1]) || rowRange[0] < 0 || rowRange[1] < rowRange[0] || rowRange[1] >= definition.rows)) {
        throw new Error('Level ' + definition.id + ' has an invalid zombie row range.');
      }
      if (spawn.row !== undefined && (!Number.isInteger(spawn.row) || spawn.row < 0 || spawn.row >= definition.rows)) {
        throw new Error('Level \"' + definition.id + '\" has a zombie row outside the lawn.');
      }
    }
  }
  registry.levels.set(definition.id, structuredClone(definition));
}

function assertUniqueExtensionId(registry: GameRegistry, id: string, kind: string): void {
  validateId(id, kind);
  if (registry.plugins.has(id) || registry.plantingRules.some((entry) => entry.id === id) || registry.plantCostRules.some((entry) => entry.id === id)) {
    throw new Error('Extension \"' + id + '\" is already registered.');
  }
  for (const entries of registry.eventHooks.values()) {
    if (entries.some((entry) => entry.id === id)) throw new Error('Extension \"' + id + '\" is already registered.');
  }
}

export function registerPlugin(registry: GameRegistry, plugin: GamePlugin): void {
  assertUniqueExtensionId(registry, plugin.id, 'Plugin');
  if (plugin.apiVersion !== 1) throw new Error('Plugin \"' + plugin.id + '\" uses unsupported API version ' + plugin.apiVersion + '.');
  registry.plugins.add(plugin.id);
  plugin.register(registry);
}

export function registerPlantingRule(registry: GameRegistry, id: string, rule: PlantingRule): void {
  assertUniqueExtensionId(registry, id, 'Rule');
  registry.plantingRules.push({ id, rule });
}

export function registerPlantCostRule(registry: GameRegistry, id: string, rule: PlantCostRule): void {
  assertUniqueExtensionId(registry, id, 'Rule');
  registry.plantCostRules.push({ id, rule });
}

export function registerEventHook(registry: GameRegistry, eventType: GameEvent['type'], id: string, hook: GameEventHook): void {
  assertUniqueExtensionId(registry, id, 'Hook');
  const hooks = registry.eventHooks.get(eventType) ?? [];
  hooks.push({ id, hook });
  registry.eventHooks.set(eventType, hooks);
}

export function createDefaultRegistry(): GameRegistry {
  const registry = createRegistry();
  PLANTS.forEach((plant) => registerPlant(registry, plant));
  for (const plant of registry.plants.values()) {
    if (plant.requiredPlantId && !registry.plants.has(plant.requiredPlantId)) {
      throw new Error('Plant "' + plant.id + '" requires unknown plant "' + plant.requiredPlantId + '".');
    }
    if (plant.consumesRequiredPlant && !plant.requiredPlantId) {
      throw new Error('Plant "' + plant.id + '" consumes a prerequisite but does not declare one.');
    }
  }
  ZOMBIES.forEach((zombie) => registerZombie(registry, zombie));
  ADVENTURE_LEVELS.forEach((level) => registerLevel(registry, level));
  return registry;
}
