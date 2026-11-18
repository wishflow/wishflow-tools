import type { ScenarioContent } from '../game';
import map from './dakota-02.json';
import {
  dakota02BaseEnemy,
  dakota02BonusCratePool,
  dakota02CampaignAwesomeEnemyTypeThreshold,
  dakota02EnemyByType,
  dakota02MaxUpgrades,
  dakota02PreviewWave,
} from './dakota-02-campaign-rules';
import { dakota02CampaignWaves } from './dakota-02-campaign-waves';
import { dakota02CampaignUnitPool } from './dakota-02-unit-pool';
import { dakota02CampaignCopy } from './dakota-02-campaign-copy';
import {
  dakota02CampaignContentVersionForSnapshot,
  dakota02CampaignUnlockSnapshotFor,
  type Dakota02CampaignUnlockSnapshot,
} from './dakota-02-content-version';
import { dakota02CampaignId } from './dakota-02-identity';
import { createDakota02MapScene } from './dakota-02-scene';
import { createDakota02MapUnitsFromSnapshot } from './dakota-02-units';

export function createDakota02CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota02CampaignContentFromSnapshot(dakota02CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota02CampaignContentFromSnapshot(
  snapshot: Dakota02CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota02CampaignId,
    contentVersion: dakota02CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota02CampaignCopy.title,
    map: createDakota02MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota02MapUnitsFromSnapshot(snapshot.unitUnlocks),
    maxUpgrades: dakota02MaxUpgrades,
    previewWave: dakota02PreviewWave,
    campaignWaveCount: dakota02CampaignWaves.length,
    campaignWaves: dakota02CampaignWaves,
    campaignUnitPool: dakota02CampaignUnitPool,
    campaignBonusCratePool: dakota02BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota02CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota02BaseEnemy,
    campaignEnemyByType: dakota02EnemyByType,
  };
}
