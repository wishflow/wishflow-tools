import type { ScenarioContent } from '../game';
import map from './mississippi-14.json';
import {
  mississippi14BonusCratePool,
  mississippi14CampaignAwesomeEnemyTypeThreshold,
  mississippi14BaseEnemy,
  mississippi14EnemyByType,
  mississippi14MaxUpgrades,
  mississippi14PreviewWave,
} from './mississippi-14-campaign-rules';
import { mississippi14CampaignWaves } from './mississippi-14-campaign-waves';
import { mississippi14CampaignId } from './mississippi-14-identity';
import { mississippi14CampaignCopy } from './mississippi-14-campaign-copy';
import { createMississippi14MapScene } from './mississippi-14-scene';
import { createMississippi14SteamerUnits } from './mississippi-14-steamer';
import { createMississippi14MapUnits } from './mississippi-14-units';
import { mississippi14CampaignUnitPool } from './mississippi-14-unit-pool';
import { mississippi14CampaignContentVersionFor } from './mississippi-14-content-version';

/** Builds Riverside Mountains' map, initial units, and APK-derived campaign rules. */
export function createMississippi14CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi14CampaignId,
    contentVersion: mississippi14CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi14CampaignCopy.title,
    map: createMississippi14MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi14SteamerUnits(),
      ...createMississippi14MapUnits(completedScenarioIds),
    ],
    maxUpgrades: mississippi14MaxUpgrades,
    previewWave: mississippi14PreviewWave,
    campaignWaveCount: mississippi14CampaignWaves.length,
    campaignWaves: mississippi14CampaignWaves,
    campaignUnitPool: mississippi14CampaignUnitPool,
    campaignBonusCratePool: mississippi14BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi14CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi14BaseEnemy,
    campaignEnemyByType: mississippi14EnemyByType,
  };
}
