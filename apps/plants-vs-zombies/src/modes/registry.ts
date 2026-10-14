import type { LevelDefinition } from '../core/types';
import { createDefaultRegistry } from '../core/registry';
import { createRandom } from '../core/random';
import { createSurvivalLevel } from './survival';
import { I_ZOMBIE_LEVELS, MINI_GAMES, VASEBREAKER_LEVELS, type MiniGameLevel } from './levelCatalog';

export type GameModeCategory = 'adventure' | 'mini-game' | 'puzzle' | 'survival' | 'garden';

export interface BattleModeSession {
  kind: 'battle';
  level: LevelDefinition;
  progression: 'adventure' | 'none';
  allowedPlantIds?: string[];
}

export interface CustomModeSession {
  kind: 'custom';
  modeId: string;
  progression: 'none';
}

export type ModeSessionDefinition = BattleModeSession | CustomModeSession;

export interface GameModeDefinition {
  id: string;
  category: GameModeCategory;
  title: string;
  description: string;
  unlockAfterLevelId?: string;
  createSession(seed: string): ModeSessionDefinition;
}

export interface GameModePlugin {
  id: string;
  apiVersion: 1;
  register(registry: GameModeRegistry): void;
}

export interface GameModeRegistry {
  modes: Map<string, GameModeDefinition>;
  plugins: Set<string>;
}

export function createGameModeRegistry(): GameModeRegistry {
  return { modes: new Map(), plugins: new Set() };
}

export function registerGameMode(registry: GameModeRegistry, definition: GameModeDefinition): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(definition.id)) throw new Error('Mode id must be a lowercase stable id: ' + definition.id);
  if (registry.modes.has(definition.id)) throw new Error('Mode "' + definition.id + '" is already registered.');
  if (definition.title.trim() === '') throw new Error('Mode "' + definition.id + '" must have a title.');
  registry.modes.set(definition.id, { ...definition });
}

export function registerGameModePlugin(registry: GameModeRegistry, plugin: GameModePlugin): void {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plugin.id)) throw new Error('Plugin id must be a lowercase stable id: ' + plugin.id);
  if (registry.plugins.has(plugin.id) || registry.modes.has(plugin.id)) throw new Error('Mode plugin "' + plugin.id + '" is already registered.');
  if (plugin.apiVersion !== 1) throw new Error('Mode plugin "' + plugin.id + '" uses unsupported API version.');
  registry.plugins.add(plugin.id);
  plugin.register(registry);
}

export function createDefaultGameModeRegistry(): GameModeRegistry {
  const registry = createGameModeRegistry();
  const terrainModes = ['day', 'night', 'pool', 'fog', 'roof'] as const;
  for (const terrain of terrainModes) {
    for (const difficulty of ['normal', 'hard'] as const) {
      const waveCount = difficulty === 'hard' ? 10 : 5;
      const level = createSurvivalLevel(terrain, waveCount, difficulty);
      registerGameMode(registry, {
        id: level.id,
        category: 'survival',
        title: level.title,
        description: difficulty === 'hard' ? 'Defend across ten increasingly difficult flags on this terrain.' : 'Defend across five flags on this terrain.',
        unlockAfterLevelId: '5-10',
        createSession: () => ({ kind: 'battle', level, progression: 'none' }),
      });
    }
  }
  const endlessPoolLevel = createSurvivalLevel('pool', 5, 'normal', true);
  registerGameMode(registry, {
    id: endlessPoolLevel.id,
    category: 'survival',
    title: endlessPoolLevel.title,
    description: 'Defend the pool through as many increasingly difficult flags as possible.',
    unlockAfterLevelId: '5-10',
    createSession: () => ({ kind: 'battle', level: endlessPoolLevel, progression: 'none' }),
  });
  const adventureLevel = createDefaultRegistry().levels.get('1-1');
  if (!adventureLevel) throw new Error('Default registry is missing the first adventure stage.');
  registerGameMode(registry, {
    id: 'adventure',
    category: 'adventure',
    title: 'Adventure',
    description: 'Play the unlocked stages in order.',
    createSession: () => ({ kind: 'battle', level: adventureLevel, progression: 'adventure' }),
  });
  for (const level of VASEBREAKER_LEVELS) {
    registerGameMode(registry, {
      id: level.id,
      category: 'puzzle',
      title: level.title,
      description: level.description,
      unlockAfterLevelId: '4-6',
      createSession: () => ({ kind: 'custom', modeId: level.id, progression: 'none' }),
    });
  }
  for (const [index, miniGame] of MINI_GAMES.entries()) {
    const isCustomRuntime = miniGame.id === 'wall-nut-bowling' || miniGame.id === 'wall-nut-bowling-2' || miniGame.id === 'whack-a-zombie';
    registerGameMode(registry, {
      id: miniGame.id,
      category: 'mini-game',
      title: miniGame.title,
      description: miniGame.description,
      unlockAfterLevelId: index < 3 ? '3-2' : '5-10',
      createSession: (seed) => isCustomRuntime
        ? { kind: 'custom', modeId: miniGame.id, progression: 'none' }
        : { kind: 'battle', level: createMiniGameLevel(miniGame, seed), progression: 'none' },
    });
  }
  for (const level of I_ZOMBIE_LEVELS) {
    registerGameMode(registry, {
      id: level.id,
      category: 'puzzle',
      title: level.title,
      description: level.description,
      unlockAfterLevelId: '4-6',
      createSession: () => ({ kind: 'custom', modeId: level.id, progression: 'none' }),
    });
  }
  registerGameMode(registry, {
    id: 'zen-garden',
    category: 'garden',
    title: 'Zen Garden',
    description: 'Care for a small garden during this browser session.',
    unlockAfterLevelId: '5-4',
    createSession: () => ({ kind: 'custom', modeId: 'zen-garden', progression: 'none' }),
  });
  return registry;
}

function createMiniGameLevel(definition: MiniGameLevel, seed: string): LevelDefinition {
  const random = createRandom(seed);
  const rows = definition.terrain === 'pool' || definition.terrain === 'fog' ? 6 : 5;
  const waveCount = definition.id === 'dr-zomboss-revenge' ? 1 : 3 + definition.difficulty;
  const waves = Array.from({ length: waveCount }, (_, index) => {
    const firstType = definition.zombiePool[Math.floor(random() * definition.zombiePool.length)] ?? 'basic';
    const secondType = definition.zombiePool[Math.floor(random() * definition.zombiePool.length)] ?? firstType;
    const count = definition.id === 'dr-zomboss-revenge' ? 1 : Math.max(1, definition.difficulty + Math.floor(index / 2));
    const zombies = [{ typeId: firstType, count, rowRange: [0, rows - 1] as [number, number] }];
    if (waveCount > 1 && index > 0 && index % 2 === 1 && secondType !== firstType) {
      zombies.push({ typeId: secondType, count: Math.max(1, Math.ceil(count / 2)), rowRange: [0, rows - 1] as [number, number] });
    }
    if (definition.id === 'dr-zomboss-revenge') zombies.splice(0, zombies.length, { typeId: 'zomboss', count: 1, rowRange: [2, 2] });
    return { atTick: 300 + index * 360, zombies };
  });
  return {
    id: 'mini-' + definition.id,
    title: definition.title,
    titleZh: definition.titleZh,
    terrain: definition.terrain,
    waterRows: definition.terrain === 'pool' || definition.terrain === 'fog' ? [2, 3] : undefined,
    rows,
    columns: 9,
    startingSun: definition.startingSun,
    skySunEveryTicks: definition.terrain === 'night' ? 0 : definition.terrain === 'fog' ? 900 : 480,
    mowerRows: Array.from({ length: rows }, (_, row) => row),
    waves,
  };
}
