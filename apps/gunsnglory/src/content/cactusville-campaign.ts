import map from './new-mexico-08.json';
import { campaignCatalog } from './campaign-catalog';
import { createCactusvilleMapScene } from './cactusville-scene';
import { cactusvilleExits, cactusvilleRedirects, cactusvilleRouteDefinitions, cactusvilleSpawnPoints } from './cactusville-routes';
import { cactusvilleCampaignWaves } from './cactusville-campaign-waves';
import { cactusvilleUnitPool } from './cactusville-unit-pool';
import { createCactusvilleUnits } from './cactusville-units';
import { createDynamiteScenarioDefinition } from './dynamite';
import type { CampaignEnemyType, PreviewEnemyDefinition, PreviewWaveDefinition, ScenarioContent } from '../game';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

export const cactusvilleCampaignId = 'campaign-new-mexico-08';
const cactusvilleCampaignContentVersionPrefix = 'gng-free-1.8.6-new-mexico-08-formal-v1';

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

export const cactusvillePreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 10,
  initialCash: 350,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 125, hard: 150 }),
  enemy: baseEnemy,
  spawn: cactusvilleSpawnPoints[0]!,
  additionalSpawns: Object.freeze(cactusvilleSpawnPoints.slice(1)),
  routes: cactusvilleRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: cactusvilleRedirects,
  exit: cactusvilleExits[0]!,
  additionalExits: Object.freeze(cactusvilleExits.slice(1)),
});

const completedLevelRequiredByUnitType: Readonly<Partial<Record<CampaignMapUnitTypeId, number>>> = Object.freeze({
  5: 40,
  6: 30,
  35: 50,
  36: 60,
});

function campaignScenarioIdForLevel(globalLevel: number): string {
  const catalogEntry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!catalogEntry) throw new Error(`Campaign level ${globalLevel} is missing from the catalog`);
  return `campaign-${catalogEntry.regionId}-${String(((globalLevel - 1) % 10) + 1).padStart(2, '0')}`;
}

interface CactusvilleUnlockSnapshot {
  dynamite: boolean;
  grandpa: boolean;
  sniper: boolean;
  pyromaniac: boolean;
  salesman: boolean;
}

function cactusvilleUnlockSnapshotFor(completedScenarioIds: readonly string[]): CactusvilleUnlockSnapshot {
  const completedScenarios = new Set(completedScenarioIds);
  const completedLevel = (level: number) => completedScenarios.has(campaignScenarioIdForLevel(level));
  return {
    dynamite: completedLevel(20) || completedLevel(30),
    grandpa: completedLevel(30),
    sniper: completedLevel(40),
    pyromaniac: completedLevel(50),
    salesman: completedLevel(60),
  };
}

function versionForSnapshot(snapshot: CactusvilleUnlockSnapshot): string {
  return `${cactusvilleCampaignContentVersionPrefix}-d${Number(snapshot.dynamite)}`
    + `-g${Number(snapshot.grandpa)}-s${Number(snapshot.sniper)}`
    + `-p${Number(snapshot.pyromaniac)}-m${Number(snapshot.salesman)}`;
}

/** Stable replay identity for the visible map objects and special units unlocked by a profile. */
export function cactusvilleCampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return versionForSnapshot(cactusvilleUnlockSnapshotFor(completedScenarioIds));
}

/** Reconstructs the profile milestones represented by an exported Cactusville replay version. */
export function cactusvilleCompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-new-mexico-08-formal-v1-d([01])-g([01])-s([01])-p([01])-m([01])$/.exec(contentVersion);
  if (!match) return undefined;
  const [dynamite, grandpa, sniper, pyromaniac, salesman] = match.slice(1).map((value) => value === '1');
  const milestones: number[] = [];
  if (grandpa) milestones.push(30);
  else if (dynamite) milestones.push(20);
  if (sniper) milestones.push(40);
  if (pyromaniac) milestones.push(50);
  if (salesman) milestones.push(60);
  const completedScenarioIds = milestones.map(campaignScenarioIdForLevel);
  return cactusvilleCampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}

export const cactusvilleCampaignContentVersion = cactusvilleCampaignContentVersionFor([]);

/** Builds Cactusville's content using the profile snapshot for special map-unit visibility. */
export function createCactusvilleCampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const unlocks = cactusvilleUnlockSnapshotFor(completedScenarioIds);
  const completedScenarios = new Set(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => {
    if (unitTypeId >= 1 && unitTypeId <= 4) return true;
    const completionLevel = completedLevelRequiredByUnitType[unitTypeId];
    return completionLevel !== undefined && completedScenarios.has(campaignScenarioIdForLevel(completionLevel));
  };

  return {
    ...map,
    id: cactusvilleCampaignId,
    contentVersion: versionForSnapshot(unlocks),
    formalSettlementSupported: true,
    title: { en: 'Cactusville · Level 8', zh: '仙人掌镇 · 第 8 关' },
    map: createCactusvilleMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createCactusvilleUnits(isUnitUnlocked),
    maxUpgrades: 3,
    previewWave: cactusvillePreviewWave,
    campaignWaveCount: cactusvilleCampaignWaves.length,
    campaignWaves: cactusvilleCampaignWaves,
    campaignUnitPool: cactusvilleUnitPool,
    dynamite: createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds),
    campaignAwesomeEnemyTypeThreshold: 5,
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
