import type { ScenarioContent } from '../game';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './mississippi-12.json';
import { mississippi12BonusCratePool, mississippi12CampaignAwesomeEnemyTypeThreshold, mississippi12BaseEnemy, mississippi12EnemyByType, mississippi12MaxUpgrades, mississippi12PreviewWave } from './mississippi-12-campaign-rules';
import { mississippi12CampaignWaves } from './mississippi-12-campaign-waves';
import { mississippi12CampaignId } from './mississippi-12-identity';
import { createMississippi12MapScene } from './mississippi-12-scene';
import { createMississippi12SteamerUnits } from './mississippi-12-steamer';
import { createMississippi12MapUnits } from './mississippi-12-units';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  mississippiUnitUnlockSnapshotFromVersionSuffix,
  mississippiUnitUnlockVersionSuffix,
} from './mississippi-unit-unlocks';

const mississippi12ContentVersionPrefix = 'gng-free-1.8.6-mississippi-12-formal-v2';
const mississippi12LegacyContentVersionPrefix = 'gng-free-1.8.6-mississippi-12-formal-v1';

function contentVersionForSnapshot(snapshot: ReturnType<typeof mississippiUnitUnlockSnapshotFor>): string {
  return `${mississippi12ContentVersionPrefix}-${mississippiUnitUnlockVersionSuffix(snapshot)}`;
}

/** The stable replay identity includes every global milestone that changes this map's unit list. */
export function mississippi12CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

/** Reconstructs the Profile milestone represented by a Steam Valley replay. */
export function mississippi12CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const legacyMatch = /^gng-free-1\.8\.6-mississippi-12-formal-v1-pyro([01])$/.exec(contentVersion);
  if (legacyMatch) {
    const snapshot = {
      grandpa: false,
      sniper: false,
      pyromaniac: legacyMatch[1] === '1',
      salesman: false,
    };
    return `${mississippi12LegacyContentVersionPrefix}-pyro${Number(snapshot.pyromaniac)}` === contentVersion
      ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
      : undefined;
  }

  const prefix = `${mississippi12ContentVersionPrefix}-`;
  if (!contentVersion.startsWith(prefix)) return undefined;
  const snapshot = mississippiUnitUnlockSnapshotFromVersionSuffix(contentVersion.slice(prefix.length));
  return snapshot && contentVersionForSnapshot(snapshot) === contentVersion
    ? completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot)
    : undefined;
}

export const mississippi12CampaignContentVersion = mississippi12CampaignContentVersionFor([]);

/** Builds Steam Valley from the TDM and APK-derived data using the Profile's unlock snapshot. */
export function createMississippi12CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  const snapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId): boolean => mississippiUnitUnlocked(unitTypeId, snapshot);

  return {
    id: mississippi12CampaignId,
    contentVersion: contentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: { en: 'Steam Valley', zh: '蒸汽谷' },
    map: createMississippi12MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi12SteamerUnits(),
      ...createMississippi12MapUnits(isUnitUnlocked),
    ],
    maxUpgrades: mississippi12MaxUpgrades,
    previewWave: mississippi12PreviewWave,
    campaignWaveCount: mississippi12CampaignWaves.length,
    campaignWaves: mississippi12CampaignWaves,
    campaignBonusCratePool: mississippi12BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi12CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi12BaseEnemy,
    campaignEnemyByType: mississippi12EnemyByType,
  };
}
