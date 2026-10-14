import type { LevelDefinition, LevelTerrain, WaveDefinition } from '../core/types';

const TERRAIN_NAMES: Record<LevelTerrain, { en: string; zh: string }> = {
  day: { en: 'Day', zh: '白天' },
  night: { en: 'Night', zh: '夜晚' },
  pool: { en: 'Pool', zh: '泳池' },
  fog: { en: 'Fog', zh: '浓雾' },
  roof: { en: 'Roof', zh: '屋顶' },
};

const ZOMBIE_POOLS: Record<LevelTerrain, string[]> = {
  day: ['basic', 'conehead', 'pole-vaulter', 'buckethead', 'football', 'dancer'],
  night: ['basic', 'conehead', 'newspaper', 'jack-in-the-box', 'balloon', 'digger'],
  pool: ['basic', 'duckytube', 'snorkel', 'dolphin-rider', 'zamboni', 'bobsled'],
  fog: ['basic', 'duckytube', 'snorkel', 'balloon', 'digger', 'gargantuar'],
  roof: ['basic', 'conehead', 'ladder', 'catapult', 'pogo', 'gargantuar'],
};

export function createSurvivalLevel(
  terrain: LevelTerrain = 'day',
  waveCount = 5,
  difficulty: 'normal' | 'hard' = 'normal',
  endless = false,
): LevelDefinition {
  if (!Number.isInteger(waveCount) || waveCount < 1 || waveCount > 100) throw new Error('Survival wave count must be between 1 and 100.');
  const rows = terrain === 'pool' || terrain === 'fog' ? 6 : 5;
  const types = ZOMBIE_POOLS[terrain];
  const waves: WaveDefinition[] = Array.from({ length: waveCount }, (_, index) => {
    const waveNumber = index + 1;
    const firstType = types[Math.min(types.length - 1, Math.floor(index / 3))] ?? 'basic';
    const typeIndex = (index + Math.floor(index / 4)) % types.length;
    const secondType = types[typeIndex] ?? firstType;
    const normalCount = 1 + Math.floor(waveNumber / 3);
    const count = difficulty === 'hard' ? Math.ceil(normalCount * 1.5) : normalCount;
    const spawns = waveNumber % 5 === 0
      ? [{ typeId: firstType, count, rowRange: [0, rows - 1] as [number, number] }, { typeId: secondType, count: Math.max(1, Math.ceil(count / 2)), rowRange: [0, rows - 1] as [number, number] }]
      : [{ typeId: secondType, count, rowRange: [0, rows - 1] as [number, number] }];
    if (waveNumber === waveCount && waveCount >= 10) {
      spawns.push({ typeId: terrain === 'roof' ? 'gargantuar' : 'buckethead', count: Math.max(1, Math.floor(waveCount / 10)), rowRange: [0, rows - 1] as [number, number] });
    }
    return { atTick: 600 + index * (difficulty === 'hard' ? 300 : 360), zombies: spawns };
  });
  const name = TERRAIN_NAMES[terrain];
  return {
    id: 'survival-' + terrain + (difficulty === 'hard' ? '-hard' : '') + (endless ? '-endless' : ''),
    title: 'Survival · ' + name.en + (difficulty === 'hard' ? ' · Hard' : '') + (endless ? ' · Endless' : ''),
    titleZh: '生存 · ' + name.zh + (difficulty === 'hard' ? ' · 困难' : '') + (endless ? ' · 无尽' : ''),
    terrain,
    waterRows: terrain === 'pool' || terrain === 'fog' ? [2, 3] : undefined,
    rows,
    columns: 9,
    startingSun: 50,
    skySunEveryTicks: terrain === 'night' ? 0 : terrain === 'fog' ? 900 : 480,
    intermissionAfterWaves: true,
    waveStartDelayTicks: difficulty === 'hard' ? 300 : 360,
    endlessWaveRule: endless ? {
      zombiePool: types,
      baseCount: 4,
      countEveryWaves: 2,
      startDelayTicks: 360,
    } : undefined,
    mowerRows: Array.from({ length: rows }, (_, row) => row),
    waves,
  };
}
