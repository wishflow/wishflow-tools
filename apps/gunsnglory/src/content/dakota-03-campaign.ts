import type { ScenarioContent } from '../game';
import map from './dakota-03.json';
import {
  dakota03BaseEnemy,
  dakota03BonusCratePool,
  dakota03CampaignAwesomeEnemyTypeThreshold,
  dakota03EnemyByType,
  dakota03MaxUpgrades,
  dakota03PreviewWave,
} from './dakota-03-campaign-rules';
import { dakota03CampaignWaves } from './dakota-03-campaign-waves';
import { dakota03CampaignUnitPool } from './dakota-03-unit-pool';
import { dakota03CampaignCopy } from './dakota-03-campaign-copy';
import {
  dakota03CampaignContentVersionForSnapshot,
  dakota03CampaignUnlockSnapshotFor,
  type Dakota03CampaignUnlockSnapshot,
} from './dakota-03-content-version';
import { dakota03CampaignId } from './dakota-03-identity';
import { createDakota03MapScene } from './dakota-03-scene';
import { createDakota03MapUnitsFromSnapshot } from './dakota-03-units';

export function createDakota03CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota03CampaignContentFromSnapshot(dakota03CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota03CampaignContentFromSnapshot(
  snapshot: Dakota03CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota03CampaignId,
    contentVersion: dakota03CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota03CampaignCopy.title,
    map: createDakota03MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota03MapUnitsFromSnapshot(snapshot.unitUnlocks),
    maxUpgrades: dakota03MaxUpgrades,
    previewWave: dakota03PreviewWave,
    campaignWaveCount: dakota03CampaignWaves.length,
    campaignWaves: dakota03CampaignWaves,
    campaignUnitPool: dakota03CampaignUnitPool,
    campaignBonusCratePool: dakota03BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota03CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota03BaseEnemy,
    campaignEnemyByType: dakota03EnemyByType,
  };
}
