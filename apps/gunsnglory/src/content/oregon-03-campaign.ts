import type { ScenarioContent } from '../game';
import map from './oregon-03.json';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import {
  oregon03CampaignAwesomeEnemyTypeThreshold,
  oregon03BaseEnemy,
  oregon03BonusCratePool,
  oregon03EnemyByType,
  oregon03MaxUpgrades,
  oregon03PreviewWave,
} from './oregon-03-campaign-rules';
import { oregon03CampaignWaves } from './oregon-03-campaign-waves';
import { oregon03CampaignCopy } from './oregon-03-campaign-copy';
import { oregon03CampaignContentVersionFor } from './oregon-03-content-version';
import { oregon03CampaignId } from './oregon-03-identity';
import { createOregon03MapContent } from './oregon-03-map-entities';
import { oregon03CampaignUnitPool } from './oregon-03-unit-pool';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Chinook Woods from the profile or replay snapshot controlling fresh hires. */
export function createOregon03CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const unlockSnapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlockSnapshot);
  const { units, scene } = createOregon03MapContent(isUnitUnlocked);

  return {
    id: oregon03CampaignId,
    contentVersion: oregon03CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: oregon03CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon03MaxUpgrades,
    previewWave: oregon03PreviewWave,
    campaignWaveCount: oregon03CampaignWaves.length,
    campaignWaves: oregon03CampaignWaves,
    campaignUnitPool: oregon03CampaignUnitPool,
    campaignBonusCratePool: oregon03BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon03CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon03BaseEnemy,
    campaignEnemyByType: oregon03EnemyByType,
  };
}
