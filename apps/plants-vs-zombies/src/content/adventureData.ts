import type { AdventureWavePlan, LevelTerrain } from '../core/types';

/**
 * PC GOTY stage facts transcribed from the reverse-reconstruction's
 * `gZombieWaves` and `gZombieAllowedLevels` tables and level checks.
 * The wave picker is reconstructed separately and seeded for repeatable runs;
 * the original's per-profile RNG stream and spawn pacing are not represented here.
 * See the project README for source links and scope notes.
 */
export const GOTY_ADVENTURE_WAVE_COUNTS = [
  4, 6, 8, 10, 8, 10, 20, 10, 20, 20,
  10, 20, 10, 20, 10, 10, 20, 10, 20, 20,
  10, 20, 20, 30, 20, 20, 30, 20, 30, 30,
  10, 20, 10, 20, 20, 10, 20, 10, 20, 20,
  10, 20, 20, 30, 20, 20, 30, 20, 30, 30,
] as const;

const ZOMBIE_LEVELS: Readonly<Record<string, readonly number[]>> = {
  basic: Array.from({ length: 50 }, (_, index) => index + 1),
  conehead: [...Array.from({ length: 8 }, (_, index) => index + 3), ...Array.from({ length: 39 }, (_, index) => index + 12)],
  'pole-vaulter': [6, 7, 9, 10, 14, 15, 24, 29, 42],
  buckethead: [8, 9, 10, 12, 15, 22, 24, 27, 29, 30, 37, 39, 40, 42, 45, 49, 50],
  newspaper: [11, 12, 15, 22, 24],
  'screen-door': [13, 14, 17, 19, 20],
  football: [16, 17, 20, 22, 25, 32, 44],
  dancer: [18, 19, 20],
  'backup-dancer': [18, 19, 20],
  snorkel: [23, 24, 25, 27, 30],
  zamboni: [26, 27, 29, 30],
  bobsled: [26, 27, 29, 30],
  'dolphin-rider': [28, 29, 30, 34],
  'jack-in-the-box': [31, 32, 37, 40, 49, 50],
  balloon: [33, 34, 39, 40],
  digger: [36, 37, 40],
  pogo: [38, 39, 40, 44],
  bungee: [41, 42, 47, 49, 50],
  ladder: [43, 44, 45, 47, 49, 50],
  catapult: [46, 47, 49, 50],
  gargantuar: [48, 49, 50],
  imp: [48, 49, 50],
};

const INTRO_ZOMBIE_BY_LEVEL: Readonly<Record<number, string>> = {
  3: 'conehead',
  6: 'pole-vaulter',
  8: 'buckethead',
  11: 'newspaper',
  13: 'screen-door',
  16: 'football',
  18: 'dancer',
  23: 'snorkel',
  26: 'zamboni',
  28: 'dolphin-rider',
  31: 'jack-in-the-box',
  33: 'balloon',
  36: 'digger',
  38: 'pogo',
  41: 'bungee',
  43: 'ladder',
  46: 'catapult',
  48: 'gargantuar',
};

const SPECIAL_MODE_BY_LEVEL: Readonly<Record<number, AdventureWavePlan['specialModeId']>> = {
  5: 'wall-nut-bowling',
  15: 'whack-a-zombie',
  25: 'little-trouble',
  35: 'scary-potter',
  40: 'stormy-night',
  45: 'bungee-blitz',
  50: 'final-boss',
};

const WAVE_POINT_MULTIPLIER_BY_LEVEL: Readonly<Record<number, number>> = {
  5: 4,
  10: 3,
  20: 3,
  25: 4,
  30: 3,
  40: 3,
  45: 2,
};

const REWARD_PLANT_BY_LEVEL: Readonly<Record<number, string>> = {
  1: 'sunflower', 2: 'cherry-bomb', 3: 'wall-nut', 5: 'potato-mine', 6: 'snow-pea', 7: 'chomper', 8: 'repeater', 10: 'puff-shroom',
  11: 'sun-shroom', 12: 'fume-shroom', 13: 'grave-buster', 15: 'hypno-shroom', 16: 'scaredy-shroom', 17: 'ice-shroom', 18: 'doom-shroom', 20: 'lily-pad',
  21: 'squash', 22: 'threepeater', 23: 'tangle-kelp', 25: 'jalapeno', 26: 'spikeweed', 27: 'torchwood', 28: 'tall-nut', 30: 'sea-shroom',
  31: 'plantern', 32: 'cactus', 33: 'blover', 35: 'split-pea', 36: 'starfruit', 37: 'pumpkin', 38: 'magnet-shroom', 40: 'cabbage-pult',
  41: 'flower-pot', 42: 'kernel-pult', 43: 'coffee-bean', 45: 'garlic', 46: 'umbrella-leaf', 47: 'marigold', 48: 'melon-pult',
};

const TERRAIN_TITLES: Record<LevelTerrain, { title: string; titleZh: string }> = {
  day: { title: 'Front Yard · Day', titleZh: '前院 · 白天' },
  night: { title: 'Front Yard · Night', titleZh: '前院 · 夜晚' },
  pool: { title: 'Backyard · Pool', titleZh: '后院 · 泳池' },
  fog: { title: 'Backyard · Fog', titleZh: '后院 · 浓雾' },
  roof: { title: 'Roof · Day', titleZh: '屋顶 · 白天' },
  boss: { title: 'Roof · Boss', titleZh: '屋顶 · 首领战' },
};

export interface AdventureStageRecord {
  id: string;
  levelNumber: number;
  terrain: LevelTerrain;
  rows: number;
  startingSun: number;
  waveCount: number;
  rewardPlantId?: string;
  specialModeId?: AdventureWavePlan['specialModeId'];
  adventureWavePlan: AdventureWavePlan;
}

function terrainForLevel(levelNumber: number): LevelTerrain {
  if (levelNumber <= 10) return 'day';
  if (levelNumber <= 20) return 'night';
  if (levelNumber <= 30) return 'pool';
  if (levelNumber <= 40) return levelNumber === 35 ? 'night' : 'fog';
  if (levelNumber < 50) return 'roof';
  return 'boss';
}

function rowsForLevel(levelNumber: number, terrain: LevelTerrain): number {
  if (levelNumber === 1) return 1;
  if (levelNumber === 2 || levelNumber === 3) return 3;
  return terrain === 'pool' || terrain === 'fog' ? 6 : 5;
}

function eligibleZombieIds(levelNumber: number): string[] {
  const eligible = Object.entries(ZOMBIE_LEVELS)
    .filter(([, levels]) => levels.includes(levelNumber))
    .map(([typeId]) => typeId);
  return eligible;
}

export const ADVENTURE_STAGE_DATA: AdventureStageRecord[] = GOTY_ADVENTURE_WAVE_COUNTS.map((waveCount, index) => {
  const levelNumber = index + 1;
  const terrain = terrainForLevel(levelNumber);
  const specialModeId = SPECIAL_MODE_BY_LEVEL[levelNumber];
  const plan: AdventureWavePlan = {
    levelNumber,
    waveCount,
    eligibleZombieIds: eligibleZombieIds(levelNumber),
    introZombieId: INTRO_ZOMBIE_BY_LEVEL[levelNumber],
    afterAdventureZombieId: levelNumber === 40 ? 'yeti' : undefined,
    bossEncounterId: levelNumber === 50 ? 'dr-zomboss' : undefined,
    rewardPlantId: REWARD_PLANT_BY_LEVEL[levelNumber],
    specialModeId,
    wavePointMultiplier: WAVE_POINT_MULTIPLIER_BY_LEVEL[levelNumber] ?? 1,
  };
  return {
    id: Math.floor(index / 10 + 1) + '-' + (index % 10 + 1),
    levelNumber,
    terrain,
    rows: rowsForLevel(levelNumber, terrain),
    startingSun: levelNumber === 1 ? 150 : 50,
    waveCount,
    rewardPlantId: REWARD_PLANT_BY_LEVEL[levelNumber],
    specialModeId,
    adventureWavePlan: plan,
  };
});

export function getAdventureStageTitle(terrain: LevelTerrain): { title: string; titleZh: string } {
  return TERRAIN_TITLES[terrain];
}
