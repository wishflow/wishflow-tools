import type { ScenarioContent } from '../game';
import map from './mississippi-20.json';
import {
  mississippi20BonusCratePool,
  mississippi20CampaignAwesomeEnemyTypeThreshold,
  mississippi20BaseEnemy,
  mississippi20EnemyByType,
  mississippi20MaxUpgrades,
  mississippi20PreviewWave,
} from './mississippi-20-campaign-rules';
import { mississippi20CampaignWaves } from './mississippi-20-campaign-waves';
import { mississippi20CampaignCopy } from './mississippi-20-campaign-copy';
import { mississippi20CampaignId } from './mississippi-20-identity';
import { createMississippi20MapScene } from './mississippi-20-scene';
import { createMississippi20MapUnits } from './mississippi-20-units';
import { mississippi20CampaignUnitPool } from './mississippi-20-unit-pool';
import { mississippi20CampaignContentVersionFor } from './mississippi-20-content-version';

/** Builds Horse Hills from the global unit-unlock snapshot recorded in a replay. */
export function createMississippi20CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi20CampaignId,
    contentVersion: mississippi20CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi20CampaignCopy.title,
    map: createMississippi20MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi20MapUnits(completedScenarioIds),
    maxUpgrades: mississippi20MaxUpgrades,
    previewWave: mississippi20PreviewWave,
    campaignWaveCount: mississippi20CampaignWaves.length,
    campaignWaves: mississippi20CampaignWaves,
    campaignUnitPool: mississippi20CampaignUnitPool,
    campaignBonusCratePool: mississippi20BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi20CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi20BaseEnemy,
    campaignEnemyByType: mississippi20EnemyByType,
  };
}
