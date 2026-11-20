import type { ScenarioContent } from '../game';
import map from './dakota-06.json';
import {
  dakota06BaseEnemy,
  dakota06BonusCratePool,
  dakota06CampaignAwesomeEnemyTypeThreshold,
  dakota06EnemyByType,
  dakota06MaxUpgrades,
  dakota06PreviewWave,
} from './dakota-06-campaign-rules';
import { dakota06CampaignWaves } from './dakota-06-campaign-waves';
import { dakota06CampaignCopy } from './dakota-06-campaign-copy';
import {
  dakota06CampaignContentVersionForSnapshot,
  dakota06CampaignUnlockSnapshotFor,
  type Dakota06CampaignUnlockSnapshot,
} from './dakota-06-content-version';
import { dakota06CampaignId } from './dakota-06-identity';
import { createDakota06DynamiteDefinitionFromSnapshot } from './dakota-06-dynamite';
import { createDakota06MapScene } from './dakota-06-scene';
import { createDakota06MapUnitsFromSnapshot } from './dakota-06-units';
import { dakota06CampaignUnitPool } from './dakota-06-unit-pool';

export function createDakota06CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota06CampaignContentFromSnapshot(dakota06CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota06CampaignContentFromSnapshot(
  snapshot: Dakota06CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota06CampaignId,
    contentVersion: dakota06CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota06CampaignCopy.title,
    map: createDakota06MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota06MapUnitsFromSnapshot(snapshot.unitUnlocks),
    dynamite: createDakota06DynamiteDefinitionFromSnapshot(snapshot.dynamiteUnlocked),
    maxUpgrades: dakota06MaxUpgrades,
    previewWave: dakota06PreviewWave,
    campaignWaveCount: dakota06CampaignWaves.length,
    campaignWaves: dakota06CampaignWaves,
    campaignUnitPool: dakota06CampaignUnitPool,
    campaignBonusCratePool: dakota06BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota06CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota06BaseEnemy,
    campaignEnemyByType: dakota06EnemyByType,
  };
}
