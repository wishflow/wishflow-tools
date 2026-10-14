import { ADVENTURE_LEVELS, PLANTS } from '../content/base';
import { I_ZOMBIE_LEVELS, MINI_GAMES, VASEBREAKER_LEVELS } from '../modes/levelCatalog';

export interface PlayerProfile {
  version: 2;
  settings: {
    music: boolean;
    sound: boolean;
    screenShake: boolean;
  };
  adventure: {
    unlockedLevels: string[];
    completedLevels: string[];
  };
  unlockedPlants: string[];
  unlockedModes: string[];
  completedModes: string[];
}

export const PROFILE_KEY = 'wishflow-plants-vs-zombies-profile';

export const DEFAULT_PROFILE: PlayerProfile = Object.freeze({
  version: 2,
  settings: Object.freeze({ music: true, sound: true, screenShake: true }),
  adventure: Object.freeze({ unlockedLevels: ['1-1'], completedLevels: [] }),
  unlockedPlants: Object.freeze(['sunflower', 'peashooter']) as unknown as string[],
  unlockedModes: Object.freeze([]) as unknown as string[],
  completedModes: Object.freeze([]) as unknown as string[],
});

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function cloneProfile(profile: PlayerProfile): PlayerProfile {
  return {
    version: 2,
    settings: { ...profile.settings },
    adventure: {
      unlockedLevels: [...profile.adventure.unlockedLevels],
      completedLevels: [...profile.adventure.completedLevels],
    },
    unlockedPlants: [...profile.unlockedPlants],
    unlockedModes: [...profile.unlockedModes],
    completedModes: [...profile.completedModes],
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isIdArray(value: unknown, knownIds: ReadonlySet<string>): value is string[] {
  return isStringArray(value) && value.every((item) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item) && knownIds.has(item));
}

function isUniqueIdArray(value: unknown, knownIds: ReadonlySet<string>): value is string[] {
  return isIdArray(value, knownIds) && new Set(value).size === value.length;
}

const knownPlantIds = new Set(PLANTS.map((plant) => plant.id));
const knownLevelIds = new Set(ADVENTURE_LEVELS.map((level) => level.id));
const knownModeIds = new Set([
  'adventure',
  'zen-garden',
  ...MINI_GAMES.map((mode) => mode.id),
  ...VASEBREAKER_LEVELS.map((mode) => mode.id),
  ...I_ZOMBIE_LEVELS.map((mode) => mode.id),
  ...(['day', 'night', 'pool', 'fog', 'roof'] as const).flatMap((terrain) => [
    'survival-' + terrain,
    'survival-' + terrain + '-hard',
  ]),
  'survival-pool-endless',
]);

function isProfile(value: unknown): value is PlayerProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<PlayerProfile>;
  return profile.version === 2
    && typeof profile.settings?.music === 'boolean'
    && typeof profile.settings?.sound === 'boolean'
    && typeof profile.settings?.screenShake === 'boolean'
    && isIdArray(profile.adventure?.unlockedLevels, knownLevelIds)
    && isIdArray(profile.adventure?.completedLevels, knownLevelIds)
    && isIdArray(profile.unlockedPlants, knownPlantIds)
    && isUniqueIdArray(profile.unlockedModes, knownModeIds)
    && isUniqueIdArray(profile.completedModes, knownModeIds);
}

function normalizeProfile(value: unknown): PlayerProfile | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = value as Record<string, unknown>;
  if (parsed.version === 1) {
    const migrated = { ...parsed, version: 2, unlockedModes: [], completedModes: [] };
    return isProfile(migrated) ? cloneProfile(migrated) : null;
  }
  return isProfile(value) ? cloneProfile(value) : null;
}

export function createProfileRepository(storage: StorageAdapter | null) {
  let memoryProfile = cloneProfile(DEFAULT_PROFILE);

  function read(): PlayerProfile {
    if (!storage) return cloneProfile(memoryProfile);
    let serialized: string | null;
    try {
      serialized = storage.getItem(PROFILE_KEY);
    } catch {
      return cloneProfile(memoryProfile);
    }
    if (serialized === null) return cloneProfile(DEFAULT_PROFILE);
    try {
      const stored = JSON.parse(serialized) as unknown;
      const parsed = normalizeProfile(stored);
      if (!parsed) return cloneProfile(DEFAULT_PROFILE);
      if (stored && typeof stored === 'object' && (stored as { version?: unknown }).version === 1) write(parsed);
      return parsed;
    } catch {
      return cloneProfile(DEFAULT_PROFILE);
    }
  }

  function write(profile: PlayerProfile): void {
    const normalized = cloneProfile(profile);
    memoryProfile = normalized;
    if (!storage) return;
    try {
      storage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    } catch {
      // The in-memory profile remains usable when browser storage is unavailable.
    }
  }

  return {
    read,
    update(mutator: (draft: PlayerProfile) => void): PlayerProfile {
      const draft = read();
      mutator(draft);
      if (!isProfile(draft)) throw new Error('Profile update produced invalid data.');
      write(draft);
      return cloneProfile(draft);
    },
    reset(): PlayerProfile {
      const profile = cloneProfile(DEFAULT_PROFILE);
      write(profile);
      return cloneProfile(profile);
    },
  };
}

export function createBrowserProfileRepository() {
  let storage: StorageAdapter | null = null;
  try {
    storage = globalThis.localStorage;
  } catch {
    storage = null;
  }
  return createProfileRepository(storage);
}
