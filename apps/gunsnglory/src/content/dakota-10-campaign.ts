import type { ScenarioContent } from '../game';
import map from './dakota-10.json';
import {
  dakota10BaseEnemy,
  dakota10BonusCratePool,
  dakota10CampaignAwesomeEnemyTypeThreshold,
  dakota10EnemyByType,
  dakota10MaxUpgrades,
  dakota10PreviewWave,
} from './dakota-10-campaign-rules';
import { dakota10CampaignWaves } from './dakota-10-campaign-waves';
import { dakota10CampaignUnitPool } from './dakota-10-unit-pool';
import { dakota10CampaignId } from './dakota-10-identity';
import { dakota10CampaignCopy } from './dakota-10-campaign-copy';
import {
  dakota10CampaignContentVersionForSnapshot,
  dakota10CampaignUnlockSnapshotFor,
  type Dakota10CampaignUnlockSnapshot,
} from './dakota-10-content-version';
import { createDakota10DynamiteDefinitionFromSnapshot } from './dakota-10-dynamite';
import { createDakota10MapScene } from './dakota-10-scene';
import { createDakota10MapUnitsFromSnapshot } from './dakota-10-units';

export function createDakota10CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota10CampaignContentFromSnapshot(dakota10CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota10CampaignContentFromSnapshot(
  snapshot: Dakota10CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota10CampaignId,
    contentVersion: dakota10CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota10CampaignCopy.title,
    map: createDakota10MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota10MapUnitsFromSnapshot(snapshot.unitUnlocks),
    maxUpgrades: dakota10MaxUpgrades,
    previewWave: dakota10PreviewWave,
    campaignWaveCount: dakota10CampaignWaves.length,
    campaignWaves: dakota10CampaignWaves,
    campaignUnitPool: dakota10CampaignUnitPool,
    campaignBonusCratePool: dakota10BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota10CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota10BaseEnemy,
    campaignEnemyByType: dakota10EnemyByType,
    dynamite: createDakota10DynamiteDefinitionFromSnapshot(snapshot.dynamiteUnlocked),
  };
}
