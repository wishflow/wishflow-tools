import type { ScenarioContent } from '../game';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import { campaignCatalog } from './campaign-catalog';
import map from './mississippi-12.json';
import { mississippi12BonusCratePool, mississippi12CampaignAwesomeEnemyTypeThreshold, mississippi12BaseEnemy, mississippi12EnemyByType, mississippi12MaxUpgrades, mississippi12PreviewWave } from './mississippi-12-campaign-rules';
import { mississippi12CampaignWaves } from './mississippi-12-campaign-waves';
import { mississippi12CampaignId } from './mississippi-12-identity';
import { createMississippi12MapScene } from './mississippi-12-scene';
import { createMississippi12SteamerUnits } from './mississippi-12-steamer';
import { createMississippi12MapUnits } from './mississippi-12-units';

const mississippi12ContentVersionPrefix = 'gng-free-1.8.6-mississippi-12-formal-v1';

interface Mississippi12UnlockSnapshot {
  pyromaniac: boolean;
}

function campaignScenarioIdForLevel(globalLevel: number): string {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!entry) throw new Error(`Campaign level ${globalLevel} is missing from the catalog`);
  const localLevel = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(localLevel).padStart(2, '0')}`;
}

function unlockSnapshotFor(completedScenarioIds: readonly string[]): Mississippi12UnlockSnapshot {
  return {
    pyromaniac: new Set(completedScenarioIds).has(campaignScenarioIdForLevel(50)),
  };
}

function contentVersionForSnapshot(snapshot: Mississippi12UnlockSnapshot): string {
  return `${mississippi12ContentVersionPrefix}-pyro${Number(snapshot.pyromaniac)}`;
}

/** The stable replay identity includes the global milestone that changes this map's unit list. */
export function mississippi12CampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(unlockSnapshotFor(completedScenarioIds));
}

/** Reconstructs the Profile milestone represented by a Steam Valley replay. */
export function mississippi12CompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-mississippi-12-formal-v1-pyro([01])$/.exec(contentVersion);
  if (!match) return undefined;

  const completedScenarioIds = match[1] === '1' ? [campaignScenarioIdForLevel(50)] : [];
  return mississippi12CampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}

export const mississippi12CampaignContentVersion = mississippi12CampaignContentVersionFor([]);

/** Builds Steam Valley from the TDM and APK-derived data using the Profile's researched unit unlock. */
export function createMississippi12CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  const snapshot = unlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId): boolean => unitTypeId === 35 && snapshot.pyromaniac;

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
