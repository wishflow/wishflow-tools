import type { ScenarioContent } from '../game';
import map from './oregon-11.json';
import {
  oregon11BaseEnemy,
  oregon11BonusCratePool,
  oregon11CampaignAwesomeEnemyTypeThreshold,
  oregon11EnemyByType,
  oregon11MaxUpgrades,
  oregon11PreviewWave,
} from './oregon-11-campaign-rules';
import { oregon11CampaignWaves } from './oregon-11-campaign-waves';
import { oregon11CampaignCopy } from './oregon-11-campaign-copy';
import {
  oregon11CampaignContentVersionForSnapshot,
  oregon11CampaignUnlockSnapshotFor,
  type Oregon11CampaignUnlockSnapshot,
} from './oregon-11-content-version';
import { oregon11CampaignId } from './oregon-11-identity';
import { createOregon11DynamiteFromUnlock } from './oregon-11-dynamite';
import { createOregon11MapContent } from './oregon-11-map-entities';
import { oregon11CampaignUnitPool } from './oregon-11-unit-pool';
import { mississippiUnitUnlocked } from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

export function createOregon11CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  return createOregon11CampaignContentFromSnapshot(oregon11CampaignUnlockSnapshotFor(completedScenarioIds));
}

export function createOregon11CampaignContentFromSnapshot(
  snapshot: Oregon11CampaignUnlockSnapshot,
): ScenarioContent {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => (
    unitTypeId <= 6
      ? true
      : unitTypeId === 9
        ? snapshot.unitUnlocks.pyromaniac
        : mississippiUnitUnlocked(unitTypeId, snapshot.unitUnlocks)
  );
  const { units, scene, gambler } = createOregon11MapContent(isUnitUnlocked);

  return {
    id: oregon11CampaignId,
    contentVersion: oregon11CampaignContentVersionForSnapshot(snapshot),
    formalSettlementSupported: true,
    title: oregon11CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon11MaxUpgrades,
    previewWave: oregon11PreviewWave,
    campaignWaveCount: oregon11CampaignWaves.length,
    campaignWaves: oregon11CampaignWaves,
    campaignUnitPool: oregon11CampaignUnitPool,
    campaignBonusCratePool: oregon11BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon11CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon11BaseEnemy,
    campaignEnemyByType: oregon11EnemyByType,
    dynamite: createOregon11DynamiteFromUnlock(snapshot.dynamiteUnlocked),
    ...(gambler ? { gambler } : {}),
  };
}
