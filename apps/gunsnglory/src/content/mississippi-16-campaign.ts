import type { ScenarioContent } from '../game';
import { createDynamiteScenarioDefinition } from './dynamite';
import map from './mississippi-16.json';
import {
  mississippi16BonusCratePool,
  mississippi16CampaignAwesomeEnemyTypeThreshold,
  mississippi16BaseEnemy,
  mississippi16EnemyByType,
  mississippi16MaxUpgrades,
  mississippi16PreviewWave,
} from './mississippi-16-campaign-rules';
import { mississippi16CampaignWaves } from './mississippi-16-campaign-waves';
import { mississippi16CampaignCopy } from './mississippi-16-campaign-copy';
import { mississippi16CampaignId } from './mississippi-16-identity';
import { createMississippi16MapScene } from './mississippi-16-scene';
import { createMississippi16MapUnits } from './mississippi-16-units';
import { mississippi16CampaignUnitPool } from './mississippi-16-unit-pool';
import { createMississippi16SteamerUnits } from './mississippi-16-steamer';
import { mississippi16CampaignContentVersionFor } from './mississippi-16-content-version';

/** Builds Highpoint Terrace with only the saved global unlocks represented in its content version. */
export function createMississippi16CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi16CampaignId,
    contentVersion: mississippi16CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi16CampaignCopy.title,
    map: createMississippi16MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi16SteamerUnits(),
      ...createMississippi16MapUnits(completedScenarioIds),
    ],
    maxUpgrades: mississippi16MaxUpgrades,
    previewWave: mississippi16PreviewWave,
    campaignWaveCount: mississippi16CampaignWaves.length,
    campaignWaves: mississippi16CampaignWaves,
    campaignUnitPool: mississippi16CampaignUnitPool,
    campaignBonusCratePool: mississippi16BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi16CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi16BaseEnemy,
    campaignEnemyByType: mississippi16EnemyByType,
    dynamite: createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds),
  };
}
