import map from './new-mexico-07.json';
import { campaignCatalog } from './campaign-catalog';
import { createLuckyLakeMapScene } from './lucky-lake-scene';
import { luckyLakeExits, luckyLakeRedirects, luckyLakeRouteDefinitions, luckyLakeSpawnPoints } from './lucky-lake-routes';
import { luckyLakeCampaignWaves } from './lucky-lake-campaign-waves';
import { luckyLakeUnitPool } from './lucky-lake-unit-pool';
import { createLuckyLakeUnits } from './lucky-lake-units';
import type { CampaignEnemyType, PreviewEnemyDefinition, PreviewWaveDefinition, ScenarioContent } from '../game';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

export const luckyLakeCampaignId = 'campaign-new-mexico-07';
export const luckyLakeCampaignContentVersion = 'gng-free-1.8.6-new-mexico-07-formal-v1';

const baseEnemy: PreviewEnemyDefinition = Object.freeze({
  hitPoints: 18,
  cashReward: 1,
  penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
});

const enemyByType: Partial<Readonly<Record<CampaignEnemyType, PreviewEnemyDefinition>>> = Object.freeze({
  3: Object.freeze({
    hitPoints: 60,
    cashReward: 2,
    penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
    turningDurationMs: 100,
  }),
  4: Object.freeze({
    hitPoints: 200,
    cashReward: 10,
    penetration: Object.freeze({ light: 50, fire: 100, heavy: 66, poison: 100 }),
    turningDurationMs: 200,
  }),
  5: Object.freeze({
    hitPoints: 300,
    cashReward: 15,
    penetration: Object.freeze({ light: 50, fire: 100, heavy: 66, poison: 100 }),
    turningDurationMs: 100,
  }),
  6: Object.freeze({
    hitPoints: 500,
    cashReward: 25,
    penetration: Object.freeze({ light: 33, fire: 25, heavy: 100, poison: 100 }),
    turningDurationMs: 200,
  }),
  8: Object.freeze({
    hitPoints: 200,
    cashReward: 0,
    penetration: Object.freeze({ light: 100, fire: 100, heavy: 100, poison: 100 }),
    turningDurationMs: 100,
  }),
});

export const luckyLakePreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 50,
  initialCash: 400,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 150, hard: 188 }),
  enemy: baseEnemy,
  spawn: luckyLakeSpawnPoints[0]!,
  additionalSpawns: Object.freeze(luckyLakeSpawnPoints.slice(1)),
  routes: luckyLakeRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: luckyLakeRedirects,
  exit: luckyLakeExits[0]!,
  additionalExits: Object.freeze(luckyLakeExits.slice(1)),
});

const completedLevelRequiredByUnitType: Readonly<Partial<Record<CampaignMapUnitTypeId, number>>> = Object.freeze({
  5: 40,
  6: 30,
  35: 50,
  36: 60,
});

function campaignScenarioIdForLevel(globalLevel: number): string | undefined {
  const catalogEntry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!catalogEntry) return undefined;
  const levelWithinRegion = ((globalLevel - 1) % 10) + 1;
  return `campaign-${catalogEntry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

/** Builds Lucky Lake's map and campaign data from one profile unlock snapshot. */
export function createLuckyLakeCampaignContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const completedScenarios = new Set(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => {
    if (unitTypeId >= 1 && unitTypeId <= 4) return true;
    const completionLevel = completedLevelRequiredByUnitType[unitTypeId];
    const completionScenarioId = completionLevel === undefined
      ? undefined
      : campaignScenarioIdForLevel(completionLevel);
    return completionScenarioId !== undefined && completedScenarios.has(completionScenarioId);
  };

  return {
    ...map,
    id: luckyLakeCampaignId,
    contentVersion: luckyLakeCampaignContentVersion,
    formalSettlementSupported: true,
    title: { en: 'Lucky Lake · Level 7', zh: '幸运湖 · 第 7 关' },
    map: createLuckyLakeMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createLuckyLakeUnits(isUnitUnlocked),
    maxUpgrades: 3,
    previewWave: luckyLakePreviewWave,
    campaignWaveCount: luckyLakeCampaignWaves.length,
    campaignWaves: luckyLakeCampaignWaves,
    campaignUnitPool: luckyLakeUnitPool,
    campaignBonusCratePool: {
      totalCount: 999,
      intervalMs: 25_000,
      simultaneousLimit: 32,
      rewardTypeCount: 4,
    },
    campaignEnemy: baseEnemy,
    campaignEnemyByType: enemyByType,
  };
}
