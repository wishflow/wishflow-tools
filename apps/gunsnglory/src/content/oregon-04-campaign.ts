import type { ScenarioContent } from '../game';
import map from './oregon-04.json';
import { oregon04BonusCratePool, oregon04CampaignAwesomeEnemyTypeThreshold, oregon04BaseEnemy,
  oregon04EnemyByType, oregon04MaxUpgrades, oregon04PreviewWave } from './oregon-04-campaign-rules';
import { oregon04CampaignWaves } from './oregon-04-campaign-waves';
import { oregon04CampaignCopy } from './oregon-04-campaign-copy';
import { oregon04CampaignContentVersionFor } from './oregon-04-content-version';
import { oregon04CampaignId } from './oregon-04-identity';
import { createOregon04MapContent } from './oregon-04-map-entities';
import { oregon04CampaignUnitPool } from './oregon-04-unit-pool';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Fort Echo from the profile or replay snapshot controlling fresh hires. */
export function createOregon04CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const unlockSnapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlockSnapshot);
  const { units, scene } = createOregon04MapContent(isUnitUnlocked);

  return {
    id: oregon04CampaignId,
    contentVersion: oregon04CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: oregon04CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon04MaxUpgrades,
    previewWave: oregon04PreviewWave,
    campaignWaveCount: oregon04CampaignWaves.length,
    campaignWaves: oregon04CampaignWaves,
    campaignUnitPool: oregon04CampaignUnitPool,
    campaignBonusCratePool: oregon04BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon04CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon04BaseEnemy,
    campaignEnemyByType: oregon04EnemyByType,
  };
}
