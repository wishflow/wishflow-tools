import type { ScenarioContent } from '../game';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './mississippi-11.json';
import { createMississippi11MapScene } from './mississippi-11-scene';
import { createMississippi11MapUnits } from './mississippi-11-units';
import { createMississippi11TrainUnits } from './mississippi-11-trains';
import { createMississippi11SteamerUnits } from './mississippi-11-steamer';
import { mississippi11CampaignWaves } from './mississippi-11-campaign-waves';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';
import {
  mississippi11BaseEnemy,
  mississippi11BonusCratePool,
  mississippi11CampaignAwesomeEnemyTypeThreshold,
  mississippi11EnemyByType,
  mississippi11MaxUpgrades,
  mississippi11PreviewWave,
} from './mississippi-11-campaign-rules';

export const mississippi11CampaignId = 'campaign-mississippi-11';
const mississippi11ContentVersionPrefix = 'gng-free-1.8.6-mississippi-11-formal-v2';
const mississippi11LegacyContentVersionPrefix = 'gng-free-1.8.6-mississippi-11-formal-v1';

function contentVersionForSnapshot(snapshot: ReturnType<typeof mississippiUnitUnlockSnapshotFor>): string {
  return `${mississippi11ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`;
}

/** Stable replay identity includes every global milestone that changes this map's unit list. */
export function mississippi11CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

/** Reconstructs the profile milestones represented by a Traveller’s Town replay. */
export function mississippi11CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const legacyMatch = /^gng-free-1\.8\.6-mississippi-11-formal-v1-pyro([01])-sales([01])$/.exec(contentVersion);
  if (legacyMatch) {
    const snapshot = {
      grandpa: false,
      sniper: false,
      pyromaniac: legacyMatch[1] === '1',
      salesman: legacyMatch[2] === '1',
    };
    return `${mississippi11LegacyContentVersionPrefix}-pyro${Number(snapshot.pyromaniac)}`
      + `-sales${Number(snapshot.salesman)}` === contentVersion
      ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
      : undefined;
  }

  const prefix = `${mississippi11ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  return snapshot && contentVersionForSnapshot(snapshot) === contentVersion
    ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
    : undefined;
}

export const mississippi11CampaignContentVersion = mississippi11CampaignContentVersionFor([]);

/** Builds map14 content from the profile's global unlock snapshot. */
export function createMississippi11CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  const snapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId): boolean => mississippiUnitUnlocked(unitTypeId, snapshot);

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
