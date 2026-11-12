import type { ScenarioContent } from '../game';
import map from './mississippi-19.json';
import {
  mississippi19BonusCratePool,
  mississippi19CampaignAwesomeEnemyTypeThreshold,
  mississippi19BaseEnemy,
  mississippi19EnemyByType,
  mississippi19MaxUpgrades,
  mississippi19PreviewWave,
} from './mississippi-19-campaign-rules';
import { mississippi19CampaignWaves } from './mississippi-19-campaign-waves';
import { mississippi19CampaignCopy } from './mississippi-19-campaign-copy';
import { mississippi19CampaignId } from './mississippi-19-identity';
import { createMississippi19MapScene } from './mississippi-19-scene';
import { createMississippi19MapUnits } from './mississippi-19-units';
import { mississippi19CampaignUnitPool } from './mississippi-19-unit-pool';
import { mississippi19CampaignContentVersionFor } from './mississippi-19-content-version';

/** Builds Dust Falls from the global unit-unlock snapshot stored in its replay version. */
export function createMississippi19CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi19CampaignId,
    contentVersion: mississippi19CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi19CampaignCopy.title,
    map: createMississippi19MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi19MapUnits(completedScenarioIds),
    maxUpgrades: mississippi19MaxUpgrades,
    previewWave: mississippi19PreviewWave,
    campaignWaveCount: mississippi19CampaignWaves.length,
    campaignWaves: mississippi19CampaignWaves,
    campaignUnitPool: mississippi19CampaignUnitPool,
    campaignBonusCratePool: mississippi19BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi19CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi19BaseEnemy,
    campaignEnemyByType: mississippi19EnemyByType,
  };
}
