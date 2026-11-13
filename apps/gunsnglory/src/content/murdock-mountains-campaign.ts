import map from './new-mexico-06.json';
import { campaignCatalog } from './campaign-catalog';
import { createMurdockMountainsMapScene } from './murdock-mountains-scene';
import {
  murdockMountainsExits,
  murdockMountainsRedirects,
  murdockMountainsRouteDefinitions,
  murdockMountainsSpawnPoints,
} from './murdock-mountains-routes';
import { murdockMountainsCampaignWaves } from './murdock-mountains-campaign-waves';
import { murdockMountainsUnitPool } from './murdock-mountains-unit-pool';
import { createMurdockMountainsUnits } from './murdock-mountains-units';
import { newMexicoCampaignContentVersionFor } from './new-mexico-replay-content-version';
import type { CampaignEnemyType, PreviewEnemyDefinition, PreviewWaveDefinition, ScenarioContent } from '../game';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

export const murdockMountainsCampaignId = 'campaign-new-mexico-06';
/** Fixed content version used by replays recorded before profile snapshots were added. */
export const murdockMountainsCampaignContentVersion = 'gng-free-1.8.6-new-mexico-06-formal-v1';

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

/** The original level-six opening state, routes, and difficulty values. */
export const murdockMountainsPreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 50,
  initialCash: 250,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 125 }),
  enemy: baseEnemy,
  spawn: murdockMountainsSpawnPoints[0]!,
  additionalSpawns: Object.freeze(murdockMountainsSpawnPoints.slice(1)),
  routes: murdockMountainsRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: murdockMountainsRedirects,
  exit: murdockMountainsExits[0]!,
  additionalExits: Object.freeze(murdockMountainsExits.slice(1)),
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

/** Builds the researched map06 scene and combat data from one profile unlock snapshot. */
export function createMurdockMountainsCampaignContent(completedScenarioIds: readonly string[]): ScenarioContent {
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
    id: murdockMountainsCampaignId,
    contentVersion: newMexicoCampaignContentVersionFor(murdockMountainsCampaignId, completedScenarioIds),
    formalSettlementSupported: true,
    title: { en: 'Murdock Mountains · Level 6', zh: '默多克山脉 · 第 6 关' },
    map: createMurdockMountainsMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMurdockMountainsUnits(isUnitUnlocked),
    maxUpgrades: 2,
    previewWave: murdockMountainsPreviewWave,
    campaignWaveCount: murdockMountainsCampaignWaves.length,
    campaignWaves: murdockMountainsCampaignWaves,
    campaignUnitPool: murdockMountainsUnitPool,
    campaignBonusCratePool: {
      totalCount: 999,
      intervalMs: 25_000,
      simultaneousLimit: 17,
      rewardTypeCount: 4,
    },
    campaignEnemy: baseEnemy,
    campaignEnemyByType: enemyByType,
  };
}
