import type { ScenarioContent } from '../game';
import map from './oregon-10.json';
import {
  oregon10CampaignAwesomeEnemyTypeThreshold,
  oregon10BaseEnemy,
  oregon10BonusCratePool,
  oregon10EnemyByType,
  oregon10MaxUpgrades,
  oregon10PreviewWave,
} from './oregon-10-campaign-rules';
import { oregon10CampaignWaves } from './oregon-10-campaign-waves';
import { oregon10CampaignCopy } from './oregon-10-campaign-copy';
import {
  oregon10CampaignContentVersionForSnapshot,
  oregon10CampaignUnlockSnapshotFor,
  type Oregon10CampaignUnlockSnapshot,
} from './oregon-10-content-version';
import { oregon10CampaignId } from './oregon-10-identity';
import { createOregon10DynamiteFromUnlock } from './oregon-10-dynamite';
import { createOregon10MapContent } from './oregon-10-map-entities';
import { oregon10CampaignUnitPool } from './oregon-10-unit-pool';
import { mississippiUnitUnlocked } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Lumber Mill Hills from the current profile's completed-level unlocks. */
export function createOregon10CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createOregon10CampaignContentFromSnapshot(oregon10CampaignUnlockSnapshotFor(completedScenarioIds));
}

/** Rebuilds the exact recorded hire and Dynamite state without consulting another profile. */
export function createOregon10CampaignContentFromSnapshot(
  snapshot: Oregon10CampaignUnlockSnapshot,
): ScenarioContent {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => (
    mississippiUnitUnlocked(unitTypeId, snapshot.unitUnlocks)
  );
  const { units, scene } = createOregon10MapContent(isUnitUnlocked);

  return {
    id: oregon10CampaignId,
    contentVersion: oregon10CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: oregon10CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon10MaxUpgrades,
    previewWave: oregon10PreviewWave,
    campaignWaveCount: oregon10CampaignWaves.length,
    campaignWaves: oregon10CampaignWaves,
    campaignUnitPool: oregon10CampaignUnitPool,
    campaignBonusCratePool: oregon10BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon10CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon10BaseEnemy,
    campaignEnemyByType: oregon10EnemyByType,
    dynamite: createOregon10DynamiteFromUnlock(snapshot.dynamiteUnlocked),
  };
}
