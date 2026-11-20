import type { ScenarioContent } from '../game';
import map from './dakota-07.json';
import {
  dakota07BaseEnemy,
  dakota07BonusCratePool,
  dakota07CampaignAwesomeEnemyTypeThreshold,
  dakota07EnemyByType,
  dakota07MaxUpgrades,
  dakota07PreviewWave,
} from './dakota-07-campaign-rules';
import { dakota07CampaignWaves } from './dakota-07-campaign-waves';
import { dakota07CampaignCopy } from './dakota-07-campaign-copy';
import {
  dakota07CampaignContentVersionForSnapshot,
  dakota07CampaignUnlockSnapshotFor,
  type Dakota07CampaignUnlockSnapshot,
} from './dakota-07-content-version';
import { dakota07CampaignId } from './dakota-07-identity';
import { createDakota07MapScene } from './dakota-07-scene';
import { createDakota07MapUnitsFromSnapshot } from './dakota-07-units';

export function createDakota07CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota07CampaignContentFromSnapshot(dakota07CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota07CampaignContentFromSnapshot(
  snapshot: Dakota07CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota07CampaignId,
    contentVersion: dakota07CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota07CampaignCopy.title,
    map: createDakota07MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota07MapUnitsFromSnapshot(snapshot.unitUnlocks),
    maxUpgrades: dakota07MaxUpgrades,
    previewWave: dakota07PreviewWave,
    campaignWaveCount: dakota07CampaignWaves.length,
    campaignWaves: dakota07CampaignWaves,
    campaignBonusCratePool: dakota07BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota07CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota07BaseEnemy,
    campaignEnemyByType: dakota07EnemyByType,
  };
}
