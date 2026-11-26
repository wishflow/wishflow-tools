import type { ScenarioContent } from '../game';
import map from './nevada-01.json';
import {
  nevada01BaseEnemy,
  nevada01BonusCratePool,
  nevada01CampaignAwesomeEnemyTypeThreshold,
  nevada01EnemyByType,
  nevada01LevelParameters,
  nevada01MaxUpgrades,
  nevada01PreviewWave,
} from './nevada-01-campaign-rules';
import { nevada01CampaignWaves } from './nevada-01-campaign-waves';
import { nevada01CampaignUnitPool } from './nevada-01-unit-pool';
import { nevada01CampaignId, nevada01CampaignContentVersion } from './nevada-01-identity';
import { nevada01CampaignCopy } from './nevada-01-campaign-copy';
import { nevada01Dynamite } from './nevada-01-dynamite';
import { createNevada01MapScene } from './nevada-01-scene';
import { createNevada01MapUnits } from './nevada-01-units';

export function createNevada01CampaignContent(): ScenarioContent {
  return {
    id: nevada01CampaignId,
    contentVersion: nevada01CampaignContentVersion,
    formalSettlementSupported: true,
    title: nevada01CampaignCopy.title,
    map: createNevada01MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createNevada01MapUnits(),
    maxUpgrades: nevada01MaxUpgrades,
    previewWave: nevada01PreviewWave,
    campaignWaveCount: nevada01CampaignWaves.length,
    campaignWaves: nevada01CampaignWaves,
    campaignUnitPool: nevada01CampaignUnitPool,
    campaignBonusCratePool: nevada01BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: nevada01CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: nevada01BaseEnemy,
    campaignEnemyByType: nevada01EnemyByType,
    dynamite: nevada01Dynamite,
  };
}

export const nevada01LevelFortyOneCampaignContent = createNevada01CampaignContent();
