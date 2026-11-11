import type { ScenarioContent } from '../game';
import { campaignCatalog } from './campaign-catalog';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './mississippi-11.json';
import { createMississippi11MapScene } from './mississippi-11-scene';
import { createMississippi11MapUnits } from './mississippi-11-units';
import { createMississippi11TrainUnits } from './mississippi-11-trains';
import { createMississippi11SteamerUnits } from './mississippi-11-steamer';
import { mississippi11CampaignWaves } from './mississippi-11-campaign-waves';
import {
  mississippi11BaseEnemy,
  mississippi11BonusCratePool,
  mississippi11CampaignAwesomeEnemyTypeThreshold,
  mississippi11EnemyByType,
  mississippi11MaxUpgrades,
  mississippi11PreviewWave,
} from './mississippi-11-campaign-rules';

export const mississippi11CampaignId = 'campaign-mississippi-11';
const mississippi11ContentVersionPrefix = 'gng-free-1.8.6-mississippi-11-formal-v1';

interface Mississippi11UnlockSnapshot {
  pyromaniac: boolean;
  salesman: boolean;
}

function campaignScenarioIdForLevel(globalLevel: number): string {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!entry) throw new Error(`Campaign level ${globalLevel} is missing from the catalog`);
  const localLevel = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(localLevel).padStart(2, '0')}`;
}

function unlockSnapshotFor(completedScenarioIds: readonly string[]): Mississippi11UnlockSnapshot {
  const completed = new Set(completedScenarioIds);
  return {
    pyromaniac: completed.has(campaignScenarioIdForLevel(50)),
    salesman: completed.has(campaignScenarioIdForLevel(60)),
  };
}

function contentVersionForSnapshot(snapshot: Mississippi11UnlockSnapshot): string {
  return `${mississippi11ContentVersionPrefix}-pyro${Number(snapshot.pyromaniac)}`
    + `-sales${Number(snapshot.salesman)}`;
}

/** Stable replay identity includes both global milestones that change this map's unit list. */
export function mississippi11CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(unlockSnapshotFor(completedScenarioIds));
}

/** Reconstructs the profile milestones represented by a Traveller’s Town replay. */
export function mississippi11CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-mississippi-11-formal-v1-pyro([01])-sales([01])$/.exec(contentVersion);
  if (!match) return undefined;

  const [pyromaniac, salesman] = match.slice(1).map((flag) => flag === '1');
  const completedScenarioIds = [
    ...(pyromaniac ? [campaignScenarioIdForLevel(50)] : []),
    ...(salesman ? [campaignScenarioIdForLevel(60)] : []),
  ];
  return mississippi11CampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}

export const mississippi11CampaignContentVersion = mississippi11CampaignContentVersionFor([]);

/** Builds map14 content using the profile's researched Pyromaniac and Salesman unlocks. */
export function createMississippi11CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  const snapshot = unlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId): boolean => {
    if (unitTypeId === 35) return snapshot.pyromaniac;
    if (unitTypeId === 36) return snapshot.salesman;
    return false;
  };

  return {
    id: mississippi11CampaignId,
    contentVersion: contentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: { en: "Traveller's Town", zh: '旅行者小镇' },
    map: createMississippi11MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi11TrainUnits(),
      ...createMississippi11SteamerUnits(),
      ...createMississippi11MapUnits(isUnitUnlocked),
    ],
    maxUpgrades: mississippi11MaxUpgrades,
    previewWave: mississippi11PreviewWave,
    campaignWaveCount: mississippi11CampaignWaves.length,
    campaignWaves: mississippi11CampaignWaves,
    campaignBonusCratePool: mississippi11BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi11CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi11BaseEnemy,
    campaignEnemyByType: mississippi11EnemyByType,
  };
}
