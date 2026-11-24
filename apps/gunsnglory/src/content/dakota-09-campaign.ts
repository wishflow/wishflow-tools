import type { ScenarioContent } from '../game';
import map from './dakota-09.json';
import {
  dakota09BaseEnemy,
  dakota09BonusCratePool,
  dakota09CampaignAwesomeEnemyTypeThreshold,
  dakota09EnemyByType,
  dakota09MaxUpgrades,
  dakota09PreviewWave,
} from './dakota-09-campaign-rules';
import { dakota09CampaignWaves } from './dakota-09-campaign-waves';
import { dakota09CampaignUnitPool } from './dakota-09-unit-pool';
import { dakota09CampaignId } from './dakota-09-identity';
import { dakota09CampaignCopy } from './dakota-09-campaign-copy';
import {
  dakota09CampaignContentVersionForSnapshot,
  dakota09CampaignUnlockSnapshotFor,
  type Dakota09CampaignUnlockSnapshot,
} from './dakota-09-content-version';
import { createDakota09MapScene } from './dakota-09-scene';
import { createDakota09MapUnitsFromSnapshot } from './dakota-09-units';

export function createDakota09CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota09CampaignContentFromSnapshot(dakota09CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota09CampaignContentFromSnapshot(
  snapshot: Dakota09CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota09CampaignId,
    contentVersion: dakota09CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota09CampaignCopy.title,
    map: createDakota09MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota09MapUnitsFromSnapshot(snapshot.unitUnlocks),
    maxUpgrades: dakota09MaxUpgrades,
    previewWave: dakota09PreviewWave,
    campaignWaveCount: dakota09CampaignWaves.length,
    campaignWaves: dakota09CampaignWaves,
    campaignUnitPool: dakota09CampaignUnitPool,
    campaignBonusCratePool: dakota09BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota09CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota09BaseEnemy,
    campaignEnemyByType: dakota09EnemyByType,
  };
}
