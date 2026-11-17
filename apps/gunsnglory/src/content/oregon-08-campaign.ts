import type { ScenarioContent } from '../game';
import map from './oregon-08.json';
import {
  oregon08CampaignAwesomeEnemyTypeThreshold,
  oregon08BaseEnemy,
  oregon08BonusCratePool,
  oregon08EnemyByType,
  oregon08MaxUpgrades,
  oregon08PreviewWave,
} from './oregon-08-campaign-rules';
import { oregon08CampaignWaves } from './oregon-08-campaign-waves';
import { oregon08CampaignCopy } from './oregon-08-campaign-copy';
import {
  oregon08CampaignContentVersionForSnapshot,
  oregon08CampaignUnlockSnapshotFor,
  type Oregon08CampaignUnlockSnapshot,
} from './oregon-08-content-version';
import { oregon08CampaignId } from './oregon-08-identity';
import { createOregon08MapContent } from './oregon-08-map-entities';
import { oregon08CampaignUnitPool } from './oregon-08-unit-pool';
import { mississippiUnitUnlocked } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds Colt City from current profile completions or a replay's recorded snapshot. */
export function createOregon08CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createOregon08CampaignContentFromSnapshot(oregon08CampaignUnlockSnapshotFor(completedScenarioIds));
}

/** Rebuilds map units, Casino/Gambler visibility, and prize templates from one canonical snapshot. */
export function createOregon08CampaignContentFromSnapshot(
  snapshot: Oregon08CampaignUnlockSnapshot,
): ScenarioContent {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => (
    unitTypeId === 9 ? snapshot.pyromaniac : mississippiUnitUnlocked(unitTypeId, snapshot)
  );
  const { units, scene, gambler } = createOregon08MapContent(isUnitUnlocked);

  return {
    id: oregon08CampaignId,
    contentVersion: oregon08CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: oregon08CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon08MaxUpgrades,
    previewWave: oregon08PreviewWave,
    campaignWaveCount: oregon08CampaignWaves.length,
    campaignWaves: oregon08CampaignWaves,
    campaignUnitPool: oregon08CampaignUnitPool,
    campaignBonusCratePool: oregon08BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon08CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon08BaseEnemy,
    campaignEnemyByType: oregon08EnemyByType,
    ...(gambler ? { gambler } : {}),
  };
}
