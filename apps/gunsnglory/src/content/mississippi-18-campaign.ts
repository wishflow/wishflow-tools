import type { ScenarioContent } from '../game';
import map from './mississippi-18.json';
import {
  mississippi18BonusCratePool,
  mississippi18CampaignAwesomeEnemyTypeThreshold,
  mississippi18BaseEnemy,
  mississippi18EnemyByType,
  mississippi18MaxUpgrades,
  mississippi18PreviewWave,
} from './mississippi-18-campaign-rules';
import { mississippi18CampaignWaves } from './mississippi-18-campaign-waves';
import { mississippi18CampaignCopy } from './mississippi-18-campaign-copy';
import { mississippi18CampaignId } from './mississippi-18-identity';
import { createMississippi18DynamiteDefinition } from './mississippi-18-dynamite';
import { createMississippi18MapScene } from './mississippi-18-scene';
import { createMississippi18MapUnits } from './mississippi-18-units';
import { mississippi18CampaignUnitPool } from './mississippi-18-unit-pool';
import { mississippi18CampaignContentVersionFor } from './mississippi-18-content-version';

/** Builds Shadow Town from the saved global unlock snapshot used by its replay version. */
export function createMississippi18CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi18CampaignId,
    contentVersion: mississippi18CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi18CampaignCopy.title,
    map: createMississippi18MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi18MapUnits(completedScenarioIds),
    maxUpgrades: mississippi18MaxUpgrades,
    previewWave: mississippi18PreviewWave,
    campaignWaveCount: mississippi18CampaignWaves.length,
    campaignWaves: mississippi18CampaignWaves,
    campaignUnitPool: mississippi18CampaignUnitPool,
    campaignBonusCratePool: mississippi18BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi18CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi18BaseEnemy,
    campaignEnemyByType: mississippi18EnemyByType,
    dynamite: createMississippi18DynamiteDefinition(completedScenarioIds),
  };
}
