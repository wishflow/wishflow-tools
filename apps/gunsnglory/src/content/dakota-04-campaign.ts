import type { ScenarioContent } from '../game';
import map from './dakota-04.json';
import {
  dakota04BaseEnemy,
  dakota04BonusCratePool,
  dakota04CampaignAwesomeEnemyTypeThreshold,
  dakota04EnemyByType,
  dakota04MaxUpgrades,
  dakota04PreviewWave,
} from './dakota-04-campaign-rules';
import { dakota04CampaignWaves } from './dakota-04-campaign-waves';
import { dakota04CampaignCopy } from './dakota-04-campaign-copy';
import {
  dakota04CampaignContentVersionForSnapshot,
  dakota04CampaignUnlockSnapshotFor,
  type Dakota04CampaignUnlockSnapshot,
} from './dakota-04-content-version';
import { dakota04CampaignId } from './dakota-04-identity';
import { createDakota04DynamiteDefinitionFromSnapshot } from './dakota-04-dynamite';
import { createDakota04MapScene } from './dakota-04-scene';
import { createDakota04MapUnitsFromSnapshot } from './dakota-04-units';
import { createDakota04TrainUnits } from './dakota-04-trains';

export function createDakota04CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota04CampaignContentFromSnapshot(dakota04CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota04CampaignContentFromSnapshot(
  snapshot: Dakota04CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota04CampaignId,
    contentVersion: dakota04CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota04CampaignCopy.title,
    map: createDakota04MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createDakota04MapUnitsFromSnapshot(snapshot.unitUnlocks),
      ...createDakota04TrainUnits(),
    ],
    dynamite: createDakota04DynamiteDefinitionFromSnapshot(snapshot.dynamiteUnlocked),
    maxUpgrades: dakota04MaxUpgrades,
    previewWave: dakota04PreviewWave,
    campaignWaveCount: dakota04CampaignWaves.length,
    campaignWaves: dakota04CampaignWaves,
    campaignBonusCratePool: dakota04BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota04CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota04BaseEnemy,
    campaignEnemyByType: dakota04EnemyByType,
  };
}
