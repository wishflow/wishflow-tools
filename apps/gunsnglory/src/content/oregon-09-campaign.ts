import type { ScenarioContent } from '../game';
import map from './oregon-09.json';
import {
  oregon09CampaignAwesomeEnemyTypeThreshold,
  oregon09BaseEnemy,
  oregon09BonusCratePool,
  oregon09EnemyByType,
  oregon09MaxUpgrades,
  oregon09PreviewWave,
} from './oregon-09-campaign-rules';
import { oregon09CampaignWaves } from './oregon-09-campaign-waves';
import { oregon09CampaignCopy } from './oregon-09-campaign-copy';
import {
  oregon09CampaignContentVersionForSnapshot,
  oregon09CampaignUnlockSnapshotFor,
  type Oregon09CampaignUnlockSnapshot,
} from './oregon-09-content-version';
import { oregon09CampaignId } from './oregon-09-identity';
import { createOregon09DynamiteFromUnlock } from './oregon-09-dynamite';
import { createOregon09MapContent } from './oregon-09-map-entities';
import { mississippiUnitUnlocked } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Snake River from the current profile's completed-level unlocks. */
export function createOregon09CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createOregon09CampaignContentFromSnapshot(oregon09CampaignUnlockSnapshotFor(completedScenarioIds));
}

/** Rebuilds the exact recorded hire and Dynamite state without consulting another profile. */
export function createOregon09CampaignContentFromSnapshot(
  snapshot: Oregon09CampaignUnlockSnapshot,
): ScenarioContent {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => (
    mississippiUnitUnlocked(unitTypeId, snapshot.unitUnlocks)
  );
  const { units, scene } = createOregon09MapContent(isUnitUnlocked);

  return {
    id: oregon09CampaignId,
    contentVersion: oregon09CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: oregon09CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon09MaxUpgrades,
    previewWave: oregon09PreviewWave,
    campaignWaveCount: oregon09CampaignWaves.length,
    campaignWaves: oregon09CampaignWaves,
    campaignBonusCratePool: oregon09BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon09CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon09BaseEnemy,
    campaignEnemyByType: oregon09EnemyByType,
    dynamite: createOregon09DynamiteFromUnlock(snapshot.dynamiteUnlocked),
  };
}
