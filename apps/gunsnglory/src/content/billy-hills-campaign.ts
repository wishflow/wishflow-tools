import map from './new-mexico-05.json';
import { campaignCatalog } from './campaign-catalog';
import { createBillyHillsMapScene } from './billy-hills-scene';
import { billyHillsRedirects, billyHillsRouteDefinitions, billyHillsSpawnPoints, billyHillsExits } from './billy-hills-routes';
import { billyHillsCampaignWaves } from './billy-hills-campaign-waves';
import { billyHillsUnitPool } from './billy-hills-unit-pool';
import { createBillyHillsUnits } from './billy-hills-units';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import type {
  CampaignEnemyType,
  PreviewEnemyDefinition,
  PreviewWaveDefinition,
  ScenarioContent,
} from '../game';

export const billyHillsCampaignId = 'campaign-new-mexico-05';
export const billyHillsCampaignContentVersion = 'gng-free-1.8.6-new-mexico-05-formal-v1';

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

export const billyHillsPreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 50,
  initialCash: 250,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 150, hard: 200 }),
  enemy: baseEnemy,
  spawn: billyHillsSpawnPoints[0]!,
  additionalSpawns: Object.freeze(billyHillsSpawnPoints.slice(1)),
  routes: billyHillsRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: billyHillsRedirects,
  exit: billyHillsExits[0]!,
  additionalExits: Object.freeze(billyHillsExits.slice(1)),
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
  return 'campaign-' + catalogEntry.regionId + '-' + String(levelWithinRegion).padStart(2, '0');
}

/**
 * Builds map05 content from one profile snapshot. The unlock gates mirror the
 * APK's completed-level branch for a fixed level-five map.
 */
export function createBillyHillsCampaignContent(completedScenarioIds: readonly string[]): ScenarioContent {
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
    id: billyHillsCampaignId,
    contentVersion: billyHillsCampaignContentVersion,
    formalSettlementSupported: true,
    title: { en: 'Billy Hills · Level 5', zh: '比利山丘 · 第 5 关' },
    map: createBillyHillsMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createBillyHillsUnits(isUnitUnlocked),
    maxUpgrades: 1,
    previewWave: billyHillsPreviewWave,
    campaignWaveCount: billyHillsCampaignWaves.length,
    campaignWaves: billyHillsCampaignWaves,
    campaignUnitPool: billyHillsUnitPool,
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

/** Initial profile content for the formal level-five stage. */
export const billyHillsLevelFiveContent = createBillyHillsCampaignContent([
  'campaign-new-mexico-01',
  'campaign-new-mexico-02',
  'campaign-new-mexico-03',
  'campaign-new-mexico-04',
]);
