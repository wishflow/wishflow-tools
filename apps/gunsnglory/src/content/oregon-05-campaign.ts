import type { ScenarioContent } from '../game';
import map from './oregon-05.json';
import {
  oregon05BonusCratePool,
  oregon05CampaignAwesomeEnemyTypeThreshold,
  oregon05BaseEnemy,
  oregon05EnemyByType,
  oregon05MaxUpgrades,
  oregon05PreviewWave,
} from './oregon-05-campaign-rules';
import { oregon05CampaignWaves } from './oregon-05-campaign-waves';
import { oregon05CampaignCopy } from './oregon-05-campaign-copy';
import { oregon05CampaignContentVersionFor } from './oregon-05-content-version';
import { oregon05CampaignId } from './oregon-05-identity';
import { createOregon05Dynamite } from './oregon-05-dynamite';
import { createOregon05MapContent } from './oregon-05-map-entities';
import { oregon05CampaignUnitPool } from './oregon-05-unit-pool';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Dynamite Plains from one profile or replay snapshot. */
export function createOregon05CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const unlockSnapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlockSnapshot);
  const { units, scene } = createOregon05MapContent(isUnitUnlocked);

  return {
    id: oregon05CampaignId,
    contentVersion: oregon05CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: oregon05CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon05MaxUpgrades,
    previewWave: oregon05PreviewWave,
    campaignWaveCount: oregon05CampaignWaves.length,
    campaignWaves: oregon05CampaignWaves,
    campaignUnitPool: oregon05CampaignUnitPool,
    campaignBonusCratePool: oregon05BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon05CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon05BaseEnemy,
    campaignEnemyByType: oregon05EnemyByType,
    dynamite: createOregon05Dynamite(completedScenarioIds),
  };
}
