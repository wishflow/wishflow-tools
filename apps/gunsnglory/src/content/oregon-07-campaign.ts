import type { ScenarioContent } from '../game';
import map from './oregon-07.json';
import {
  oregon07CampaignAwesomeEnemyTypeThreshold,
  oregon07BaseEnemy,
  oregon07BonusCratePool,
  oregon07EnemyByType,
  oregon07MaxUpgrades,
  oregon07PreviewWave,
} from './oregon-07-campaign-rules';
import { oregon07CampaignWaves } from './oregon-07-campaign-waves';
import { oregon07CampaignCopy } from './oregon-07-campaign-copy';
import {
  oregon07CampaignContentVersionForSnapshot,
  oregon07CampaignUnlockSnapshotFor,
  type Oregon07CampaignUnlockSnapshot,
} from './oregon-07-content-version';
import { oregon07CampaignId } from './oregon-07-identity';
import { createOregon07DynamiteFromUnlock } from './oregon-07-dynamite';
import { createOregon07MapContent } from './oregon-07-map-entities';
import { mississippiUnitUnlocked } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Mount Hood from the current profile or from a recorded replay snapshot. */
export function createOregon07CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createOregon07CampaignContentFromSnapshot(oregon07CampaignUnlockSnapshotFor(completedScenarioIds));
}

/** Rebuilds exact recorded unit/Dynamite visibility without deriving one flag from another. */
export function createOregon07CampaignContentFromSnapshot(
  snapshot: Oregon07CampaignUnlockSnapshot,
): ScenarioContent {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, snapshot.unitUnlocks);
  const { units, scene } = createOregon07MapContent(isUnitUnlocked);

  return {
    id: oregon07CampaignId,
    contentVersion: oregon07CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: oregon07CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon07MaxUpgrades,
    previewWave: oregon07PreviewWave,
    campaignWaveCount: oregon07CampaignWaves.length,
    campaignWaves: oregon07CampaignWaves,
    campaignBonusCratePool: oregon07BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon07CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon07BaseEnemy,
    campaignEnemyByType: oregon07EnemyByType,
    dynamite: createOregon07DynamiteFromUnlock(snapshot.dynamiteUnlocked),
  };
}
