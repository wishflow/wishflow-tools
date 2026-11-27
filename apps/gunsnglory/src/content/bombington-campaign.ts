import type { ScenarioContent } from '../game';
import map from './nevada-02.json';
import {
  bombingtonBonusCratePool,
  bombingtonCampaignAwesomeEnemyTypeThreshold,
  bombingtonBaseEnemy,
  bombingtonEnemyByType,
  bombingtonMaxUpgrades,
  bombingtonPreviewWave,
} from './bombington-campaign-rules';
import { bombingtonCampaignWaves } from './bombington-campaign-waves';
import { bombingtonCampaignUnitPool } from './bombington-unit-pool';
import { createBombingtonDynamiteDefinitionFromSnapshot } from './bombington-dynamite';
import { createBombingtonMapScene } from './bombington-scene';
import { createBombingtonTrainUnits } from './bombington-trains';
import { createBombingtonMapUnitsFromSnapshot } from './bombington-units';
import { bombingtonCampaignCopy } from './bombington-campaign-copy';
import { nevada02CampaignId } from './nevada-02-identity';
import {
  bombingtonCampaignContentVersionFromSnapshot,
  bombingtonUnlockSnapshotFor,
  type BombingtonUnlockSnapshot,
} from './bombington-content-version';

/** Builds the Level 42 scenario from the current profile's original global unlocks. */
export function createBombingtonCampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return createBombingtonCampaignContentFromSnapshot(bombingtonUnlockSnapshotFor(completedScenarioIds));
}

/** Replay and tests pass the recorded snapshot so present-day progress cannot alter the run. */
export function createBombingtonCampaignContentFromSnapshot(
  snapshot: BombingtonUnlockSnapshot,
): ScenarioContent {
  const contentVersion = bombingtonCampaignContentVersionFromSnapshot(snapshot);
  return {
    id: nevada02CampaignId,
    contentVersion,
    formalSettlementSupported: true,
    title: bombingtonCampaignCopy.title,
    map: createBombingtonMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createBombingtonMapUnitsFromSnapshot(snapshot),
      ...createBombingtonTrainUnits(),
    ],
    maxUpgrades: bombingtonMaxUpgrades,
    previewWave: bombingtonPreviewWave,
    campaignWaveCount: bombingtonCampaignWaves.length,
    campaignWaves: bombingtonCampaignWaves,
    campaignUnitPool: bombingtonCampaignUnitPool,
    campaignBonusCratePool: bombingtonBonusCratePool,
    campaignAwesomeEnemyTypeThreshold: bombingtonCampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: bombingtonBaseEnemy,
    campaignEnemyByType: bombingtonEnemyByType,
    dynamite: createBombingtonDynamiteDefinitionFromSnapshot(snapshot.dynamiteUnlocked),
  };
}
