import map from './new-mexico-04.json';
import { campaignCatalog } from './campaign-catalog';
import { createTechTownMapContent } from './tech-town-map-entities';
import { techTownRouteDefinitions } from './tech-town-routes';
import { techTownCampaignWaves } from './tech-town-campaign-waves';
import { techTownUnitPool } from './tech-town-unit-pool';
import { newMexicoCampaignContentVersionFor } from './new-mexico-replay-content-version';
import type {
  CampaignEnemyType,
  GamblerUnitType,
  PreviewEnemyDefinition,
  PreviewWaveDefinition,
  ScenarioContent,
  WaveRedirect,
} from '../game';

export const techTownCampaignId = 'campaign-new-mexico-04';
/** Fixed content version used by replays recorded before profile snapshots were added. */
export const techTownCampaignContentVersion = 'gng-free-1.8.6-new-mexico-04-formal-v1';

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

const uniqueExits = [...new Map(techTownRouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];
const redirectsByCell = new Map<string, { cell: { x: number; y: number }; directions: Set<WaveRedirect['directions'][number]> }>();
for (const route of techTownRouteDefinitions) {
  for (const redirect of route.redirects) {
    const key = `${redirect.cell.x},${redirect.cell.y}`;
    const existing = redirectsByCell.get(key);
    if (existing) {
      for (const direction of redirect.directions) existing.directions.add(direction);
    } else {
      redirectsByCell.set(key, { cell: { ...redirect.cell }, directions: new Set(redirect.directions) });
    }
  }
}

export const techTownPreviewRedirects: readonly WaveRedirect[] = Object.freeze(
  [...redirectsByCell.values()].map(({ cell, directions }) => Object.freeze({
    cell: Object.freeze(cell),
    directions: Object.freeze([...directions]),
  })),
);

export const techTownPreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 50,
  initialCash: 300,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 150, hard: 188 }),
  enemy: baseEnemy,
  spawn: techTownRouteDefinitions[0]!.spawn,
  additionalSpawns: Object.freeze(techTownRouteDefinitions.slice(1).map(({ spawn }) => spawn)),
  routes: techTownRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: techTownPreviewRedirects,
  exit: uniqueExits[0]!,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

const campaignPrizeTypes = [1, 2, 3, 4, 5, 6, 35, 36] as const satisfies readonly GamblerUnitType[];
/** DEX `GameDesignData.unlockUnitData` completion gates, keyed by APK unit type. */
const completedLevelRequiredByUnitType: Readonly<Partial<Record<number, number>>> = Object.freeze({
  5: 40,
  6: 30,
  9: 50,
  35: 50,
  36: 60,
});

function campaignScenarioIdForLevel(globalLevel: number): string | undefined {
  const catalogEntry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!catalogEntry) return undefined;
  // Registered stage IDs use the region slug and two-digit level within that region.
  const levelWithinRegion = ((globalLevel - 1) % 10) + 1;
  return `campaign-${catalogEntry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

/**
 * Builds the formal level from one profile snapshot. Map04's campaign spawn
 * pool uses the original type 1–4 set; placed special units follow saved unlocks.
 */
export function createTechTownCampaignContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const hasUnlockedMap04 = completedScenarioIds.includes('campaign-new-mexico-03');
  const completedScenarios = new Set(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: number) => {
    if (!hasUnlockedMap04) return false;
    if (unitTypeId >= 1 && unitTypeId <= 4) return true;
    const completionLevel = completedLevelRequiredByUnitType[unitTypeId];
    const completionScenarioId = completionLevel === undefined
      ? undefined
      : campaignScenarioIdForLevel(completionLevel);
    return completionScenarioId !== undefined && completedScenarios.has(completionScenarioId);
  };
  const mapContent = createTechTownMapContent(
    (unitTypeId) => isUnitUnlocked(unitTypeId),
    { mapAccessible: hasUnlockedMap04 },
  );
  const gambler = mapContent.units.some(({ type }) => type === 'gambler');

  return {
    ...map,
    id: techTownCampaignId,
    contentVersion: newMexicoCampaignContentVersionFor(techTownCampaignId, completedScenarioIds),
    formalSettlementSupported: true,
    title: { en: 'Tech Town · Level 4', zh: '科技镇 · 第 4 关' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: 0,
    previewWave: techTownPreviewWave,
    campaignWaveCount: techTownCampaignWaves.length,
    campaignWaves: techTownCampaignWaves,
    campaignUnitPool: techTownUnitPool,
    campaignBonusCratePool: {
      totalCount: 999,
      intervalMs: 25_000,
      simultaneousLimit: 32,
      rewardTypeCount: 4,
    },
    gambler: gambler ? {
      unlockedPrizeUnitTypes: campaignPrizeTypes.filter(isUnitUnlocked),
      cooldownMs: 299_000,
    } : undefined,
    campaignEnemy: baseEnemy,
    campaignEnemyByType: enemyByType,
  };
}

/** The first reachable profile has completed Fort Kaboom before opening map04. */
export const techTownLevelFourContent = createTechTownCampaignContent(['campaign-new-mexico-03']);
