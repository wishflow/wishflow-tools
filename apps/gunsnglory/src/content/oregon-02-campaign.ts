import type { ScenarioContent } from '../game';
import map from './oregon-02.json';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import {
  oregon02CampaignAwesomeEnemyTypeThreshold,
  oregon02BaseEnemy,
  oregon02BonusCratePool,
  oregon02EnemyByType,
  oregon02MaxUpgrades,
  oregon02PreviewWave,
} from './oregon-02-campaign-rules';
import { oregon02CampaignWaves } from './oregon-02-campaign-waves';
import { oregon02CampaignCopy } from './oregon-02-campaign-copy';
import { oregon02CampaignContentVersionFor } from './oregon-02-content-version';
import { oregon02CampaignId } from './oregon-02-identity';
import { createOregon02MapContent } from './oregon-02-map-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Cashcow Canyon from the progress snapshot used to gate its fresh-game hire markers. */
export function createOregon02CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const unlockSnapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlockSnapshot);
  const { units, scene } = createOregon02MapContent(isUnitUnlocked);

  return {
    id: oregon02CampaignId,
    contentVersion: oregon02CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: oregon02CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon02MaxUpgrades,
    previewWave: oregon02PreviewWave,
    campaignWaveCount: oregon02CampaignWaves.length,
    campaignWaves: oregon02CampaignWaves,
    campaignBonusCratePool: oregon02BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon02CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon02BaseEnemy,
    campaignEnemyByType: oregon02EnemyByType,
  };
}
