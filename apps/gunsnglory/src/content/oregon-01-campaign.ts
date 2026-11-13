import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import type { ScenarioContent } from '../game';
import map from './oregon-01.json';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import { oregon01CampaignAwesomeEnemyTypeThreshold, oregon01BaseEnemy, oregon01BonusCratePool, oregon01EnemyByType, oregon01MaxUpgrades, oregon01PreviewWave } from './oregon-01-campaign-rules';
import { oregon01CampaignWaves } from './oregon-01-campaign-waves';
import { oregon01CampaignCopy } from './oregon-01-campaign-copy';
import { oregon01CampaignId } from './oregon-01-identity';
import { createOregon01MapContent } from './oregon-01-map-entities';
import { oregon01CampaignContentVersionFor } from './oregon-01-content-version';

/** Builds Eastwood Forest from the player-unlock snapshot saved with the current profile or replay. */
export function createOregon01CampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const unlockSnapshot = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => (
    // The campaign unlocks the Gambler at level 50 alongside the Pyromaniac.
    unitTypeId === 9 ? unlockSnapshot.pyromaniac : mississippiUnitUnlocked(unitTypeId, unlockSnapshot)
  );
  const { units, scene, gambler } = createOregon01MapContent(isUnitUnlocked);

  return {
    id: oregon01CampaignId,
    contentVersion: oregon01CampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: oregon01CampaignCopy.title,
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units,
    maxUpgrades: oregon01MaxUpgrades,
    previewWave: oregon01PreviewWave,
    campaignWaveCount: oregon01CampaignWaves.length,
    campaignWaves: oregon01CampaignWaves,
    campaignBonusCratePool: oregon01BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon01CampaignAwesomeEnemyTypeThreshold,
    ...(gambler ? { gambler } : {}),
    campaignEnemy: oregon01BaseEnemy,
    campaignEnemyByType: oregon01EnemyByType,
  };
}
