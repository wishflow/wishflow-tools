import type { ScenarioContent } from '../game';
import map from './dakota-05.json';
import {
  dakota05BaseEnemy,
  dakota05BonusCratePool,
  dakota05CampaignAwesomeEnemyTypeThreshold,
  dakota05EnemyByType,
  dakota05MaxUpgrades,
  dakota05PreviewWave,
} from './dakota-05-campaign-rules';
import { dakota05CampaignWaves } from './dakota-05-campaign-waves';
import { dakota05CampaignCopy } from './dakota-05-campaign-copy';
import {
  dakota05CampaignContentVersionForSnapshot,
  dakota05CampaignUnlockSnapshotFor,
  type Dakota05CampaignUnlockSnapshot,
} from './dakota-05-content-version';
import { dakota05CampaignId } from './dakota-05-identity';
import { createDakota05MapScene } from './dakota-05-scene';
import { createDakota05SteamerUnits } from './dakota-05-steamer';
import { createDakota05TrainUnits } from './dakota-05-trains';
import { createDakota05MapUnitsFromSnapshot } from './dakota-05-units';
import { dakota05CampaignUnitPool } from './dakota-05-unit-pool';

export function createDakota05CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createDakota05CampaignContentFromSnapshot(dakota05CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota05CampaignContentFromSnapshot(
  snapshot: Dakota05CampaignUnlockSnapshot,
): ScenarioContent {
  return {
    id: dakota05CampaignId,
    contentVersion: dakota05CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: dakota05CampaignCopy.title,
    map: createDakota05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createDakota05MapUnitsFromSnapshot(snapshot.unitUnlocks),
      ...createDakota05TrainUnits(),
      ...createDakota05SteamerUnits(),
    ],
    maxUpgrades: dakota05MaxUpgrades,
    previewWave: dakota05PreviewWave,
    campaignWaveCount: dakota05CampaignWaves.length,
    campaignWaves: dakota05CampaignWaves,
    campaignUnitPool: dakota05CampaignUnitPool,
    campaignBonusCratePool: dakota05BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota05CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota05BaseEnemy,
    campaignEnemyByType: dakota05EnemyByType,
  };
}
