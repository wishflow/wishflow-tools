import { createDefaultRegistry } from '../core/registry';
import { createSurvivalStageWaves } from '../core/survivalWaves';
import type { LevelDefinition, LevelTerrain, SurvivalWavePlan, ZombieDefinition } from '../core/types';

type SurvivalTerrain = Exclude<LevelTerrain, 'boss'>;
type SurvivalDifficulty = SurvivalWavePlan['difficulty'];

const TERRAIN_NAMES: Record<SurvivalTerrain, { en: string; zh: string }> = {
  day: { en: 'Day', zh: '白天' },
  night: { en: 'Night', zh: '夜晚' },
  pool: { en: 'Pool', zh: '泳池' },
  fog: { en: 'Fog', zh: '浓雾' },
  roof: { en: 'Roof', zh: '屋顶' },
};

/**
 * Builds the authentic GOTY Survival wave counts: normal stages have 10 sub-waves,
 * hard and endless stages have 20. Normal/hard runs contain five stages; endless
 * keeps adding a 20-wave stage when the player continues after an intermission.
 */
export function createSurvivalLevel(
  terrain: SurvivalTerrain = 'day',
  difficulty: SurvivalDifficulty = 'normal',
  seed = 'survival-default',
  zombieDefinitions: ReadonlyMap<string, ZombieDefinition> = createDefaultRegistry().zombies,
): LevelDefinition {
  const waterTerrain = terrain === 'pool' || terrain === 'fog';
  const rows = waterTerrain ? 6 : 5;
  const wavesPerStage = difficulty === 'normal' ? 10 : 20;
  const endless = difficulty === 'endless';
  const totalStages = endless ? undefined : 5;
  const name = TERRAIN_NAMES[terrain];
  const survivalWavePlan: SurvivalWavePlan = { terrain, difficulty, wavesPerStage, totalStages };
  const stageCount = totalStages ?? 1;
  const waves = Array.from({ length: stageCount }, (_, stageIndex) =>
    createSurvivalStageWaves(survivalWavePlan, stageIndex, seed, rows, zombieDefinitions),
  ).flat();

  return {
    id: 'survival-' + terrain + (difficulty === 'hard' ? '-hard' : '') + (endless ? '-endless' : ''),
    title: 'Survival · ' + name.en + (difficulty === 'hard' ? ' · Hard' : '') + (endless ? ' · Endless' : ''),
    titleZh: '生存 · ' + name.zh + (difficulty === 'hard' ? ' · 困难' : '') + (endless ? ' · 无尽' : ''),
    terrain,
    waterRows: waterTerrain ? [2, 3] : undefined,
    rows,
    columns: 9,
    startingSun: 50,
    skySunEveryTicks: terrain === 'night' || terrain === 'fog' ? 0 : 480,
    intermissionAfterWaves: true,
    intermissionEveryWaves: wavesPerStage,
    waveStartDelayTicks: difficulty === 'hard' || endless ? 300 : 360,
    survivalWavePlan,
    mowerRows: Array.from({ length: rows }, (_, row) => row),
    waves,
  };
}
