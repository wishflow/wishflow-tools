import type { ScenarioContent } from '../game';
import map from './mississippi-17.json';
import {
  mississippi17BonusCratePool,
  mississippi17CampaignAwesomeEnemyTypeThreshold,
  mississippi17BaseEnemy,
  mississippi17EnemyByType,
  mississippi17MaxUpgrades,
  mississippi17PreviewWave,
} from './mississippi-17-campaign-rules';
import { mississippi17CampaignWaves } from './mississippi-17-campaign-waves';
import { mississippi17CampaignCopy } from './mississippi-17-campaign-copy';
import { mississippi17CampaignId } from './mississippi-17-identity';
import { createMississippi17MapScene } from './mississippi-17-scene';
import { createMississippi17MapUnits } from './mississippi-17-units';
import { mississippi17CampaignContentVersionFor } from './mississippi-17-content-version';

/** Builds Dead Rocks with the map hires selected by the recorded global unlock snapshot. */
export function createMississippi17CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi17CampaignId,
    contentVersion: mississippi17CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi17CampaignCopy.title,
    map: createMississippi17MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi17MapUnits(completedScenarioIds),
    maxUpgrades: mississippi17MaxUpgrades,
    previewWave: mississippi17PreviewWave,
    campaignWaveCount: mississippi17CampaignWaves.length,
    campaignWaves: mississippi17CampaignWaves,
    campaignBonusCratePool: mississippi17BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi17CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi17BaseEnemy,
    campaignEnemyByType: mississippi17EnemyByType,
  };
}
