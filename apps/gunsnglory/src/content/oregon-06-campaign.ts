import type { ScenarioContent } from '../game';
import map from './oregon-06.json';
import {
  oregon06CampaignAwesomeEnemyTypeThreshold,
  oregon06BaseEnemy,
  oregon06BonusCratePool,
  oregon06EnemyByType,
  oregon06MaxUpgrades,
  oregon06PreviewWave,
} from './oregon-06-campaign-rules';
import { oregon06CampaignWaves } from './oregon-06-campaign-waves';
import { oregon06CampaignCopy } from './oregon-06-campaign-copy';
import { oregon06CampaignContentVersionFor } from './oregon-06-content-version';
import { oregon06CampaignId } from './oregon-06-identity';
import { createOregon06Dynamite } from './oregon-06-dynamite';
import { createOregon06MapContent } from './oregon-06-map-entities';
import { oregon06CampaignUnitPool } from './oregon-06-unit-pool';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Columbia River from the current profile or the recorded replay snapshot. */
export function createOregon06CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const unlockSnapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlockSnapshot);
  const { units, scene } = createOregon06MapContent(isUnitUnlocked);

  return {
    id: oregon06CampaignId,
    contentVersion: oregon06CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: oregon06CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon06MaxUpgrades,
    previewWave: oregon06PreviewWave,
    campaignWaveCount: oregon06CampaignWaves.length,
    campaignWaves: oregon06CampaignWaves,
    campaignUnitPool: oregon06CampaignUnitPool,
    campaignBonusCratePool: oregon06BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon06CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon06BaseEnemy,
    campaignEnemyByType: oregon06EnemyByType,
    dynamite: createOregon06Dynamite(completedScenarioIds),
  };
}
