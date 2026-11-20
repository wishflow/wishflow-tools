import type { ScenarioContent } from '../game';
import map from './dakota-08.json';
import {
  dakota08BaseEnemy,
  dakota08BonusCratePool,
  dakota08CampaignAwesomeEnemyTypeThreshold,
  dakota08EnemyByType,
  dakota08MaxUpgrades,
  dakota08PreviewWave,
} from './dakota-08-campaign-rules';
import { dakota08CampaignWaves } from './dakota-08-campaign-waves';
import { dakota08CampaignUnitPool } from './dakota-08-unit-pool';
import { dakota08CampaignId } from './dakota-08-identity';
import { dakota08CampaignCopy } from './dakota-08-campaign-copy';
import {
  dakota08CampaignContentVersionForSnapshot,
  dakota08CampaignUnlockSnapshotFor,
  type Dakota08CampaignUnlockSnapshot,
} from './dakota-08-content-version';
import { createDakota08DynamiteDefinitionFromSnapshot } from './dakota-08-dynamite';
import { createDakota08MapScene } from './dakota-08-scene';
import { createDakota08MapUnitsFromSnapshot } from './dakota-08-units';

export function createDakota08CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota08CampaignContentFromSnapshot(dakota08CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota08CampaignContentFromSnapshot(
  snapshot: Dakota08CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota08CampaignId,
    contentVersion: dakota08CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota08CampaignCopy.title,
    map: createDakota08MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota08MapUnitsFromSnapshot(snapshot.unitUnlocks),
    maxUpgrades: dakota08MaxUpgrades,
    previewWave: dakota08PreviewWave,
    campaignWaveCount: dakota08CampaignWaves.length,
    campaignWaves: dakota08CampaignWaves,
    campaignUnitPool: dakota08CampaignUnitPool,
    campaignBonusCratePool: dakota08BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota08CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota08BaseEnemy,
    campaignEnemyByType: dakota08EnemyByType,
    dynamite: createDakota08DynamiteDefinitionFromSnapshot(snapshot.dynamiteUnlocked),
  };
}
