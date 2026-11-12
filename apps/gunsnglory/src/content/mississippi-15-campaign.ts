import type { ScenarioContent } from '../game';
import map from './mississippi-15.json';
import {
  mississippi15BonusCratePool,
  mississippi15CampaignAwesomeEnemyTypeThreshold,
  mississippi15BaseEnemy,
  mississippi15EnemyByType,
  mississippi15MaxUpgrades,
  mississippi15PreviewWave,
} from './mississippi-15-campaign-rules';
import { mississippi15CampaignWaves } from './mississippi-15-campaign-waves';
import { mississippi15CampaignId } from './mississippi-15-identity';
import { mississippi15CampaignCopy } from './mississippi-15-campaign-copy';
import { createMississippi15MapScene } from './mississippi-15-scene';
import { createMississippi15SteamerUnits } from './mississippi-15-steamer';
import { createMississippi15TrainUnits } from './mississippi-15-trains';
import { createMississippi15MapUnits } from './mississippi-15-units';
import { mississippi15CampaignUnitPool } from './mississippi-15-unit-pool';
import { mississippi15CampaignContentVersionFor } from './mississippi-15-content-version';

/** Builds Railroad Canyon's fresh-game map and APK-derived campaign rules. */
export function createMississippi15CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi15CampaignId,
    contentVersion: mississippi15CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi15CampaignCopy.title,
    map: createMississippi15MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi15TrainUnits(),
      ...createMississippi15SteamerUnits(),
      ...createMississippi15MapUnits(completedScenarioIds),
    ],
    maxUpgrades: mississippi15MaxUpgrades,
    previewWave: mississippi15PreviewWave,
    campaignWaveCount: mississippi15CampaignWaves.length,
    campaignWaves: mississippi15CampaignWaves,
    campaignUnitPool: mississippi15CampaignUnitPool,
    campaignBonusCratePool: mississippi15BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi15CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi15BaseEnemy,
    campaignEnemyByType: mississippi15EnemyByType,
  };
}
