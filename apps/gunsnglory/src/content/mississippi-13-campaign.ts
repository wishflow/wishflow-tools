import type { ScenarioContent } from '../game';
import map from './mississippi-13.json';
import { mississippi13BonusCratePool, mississippi13CampaignAwesomeEnemyTypeThreshold, mississippi13BaseEnemy, mississippi13EnemyByType, mississippi13MaxUpgrades, mississippi13PreviewWave } from './mississippi-13-campaign-rules';
import { mississippi13CampaignWaves } from './mississippi-13-campaign-waves';
import { mississippi13CampaignId } from './mississippi-13-identity';
import { mississippi13CampaignCopy } from './mississippi-13-campaign-copy';
import { createMississippi13MapScene } from './mississippi-13-scene';
import { createMississippi13SteamerUnits } from './mississippi-13-steamer';
import { createMississippi13MapUnits } from './mississippi-13-units';
import { mississippi13CampaignContentVersionFor } from './mississippi-13-content-version';

/** Builds Golden River's full static scenario content from its map and captured unlock state. */
export function createMississippi13CampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    id: mississippi13CampaignId,
    contentVersion: mississippi13CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: mississippi13CampaignCopy.title,
    map: createMississippi13MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi13SteamerUnits(),
      ...createMississippi13MapUnits(completedScenarioIds),
    ],
    maxUpgrades: mississippi13MaxUpgrades,
    previewWave: mississippi13PreviewWave,
    campaignWaveCount: mississippi13CampaignWaves.length,
    campaignWaves: mississippi13CampaignWaves,
    campaignBonusCratePool: mississippi13BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi13CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi13BaseEnemy,
    campaignEnemyByType: mississippi13EnemyByType,
  };
}
