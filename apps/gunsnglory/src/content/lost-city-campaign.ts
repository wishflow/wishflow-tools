import type { ScenarioContent } from '../game';
import { campaignCatalog } from './campaign-catalog';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './new-mexico-10.json';
import { createLostCityMapScene } from './lost-city-scene';
import { createLostCityMapUnits, createLostCityTrainUnits } from './lost-city-units';
import { lostCityCampaignWaves } from './lost-city-campaign-waves';
import {
  lostCityBaseEnemy,
  lostCityBonusCratePool,
  lostCityCampaignAwesomeEnemyTypeThreshold,
  lostCityEnemyByType,
  lostCityMaxUpgrades,
  lostCityPreviewWave,
} from './lost-city-campaign-rules';
import { lostCityUnitPool } from './lost-city-unit-pool';
import { lostCityCampaignCopy } from './lost-city-campaign-copy';

export const lostCityCampaignId = 'campaign-new-mexico-10';
const lostCityCampaignContentVersionPrefix = 'gng-free-1.8.6-new-mexico-10-formal-v1';

const completedLevelRequiredByUnitType: Readonly<Partial<Record<CampaignMapUnitTypeId, number>>> = Object.freeze({
  5: 40,
  6: 30,
  35: 50,
  36: 60,
});

function campaignScenarioIdForLevel(globalLevel: number): string {
  const entry = campaignCatalog.find(({ level }) => level === globalLevel);
  if (!entry) throw new Error(`Campaign level ${globalLevel} is missing from the catalog`);
  const localLevel = ((globalLevel - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(localLevel).padStart(2, '0')}`;
}

interface LostCityUnlockSnapshot {
  grandpa: boolean;
  sniper: boolean;
  pyromaniac: boolean;
  salesman: boolean;
}

function lostCityUnlockSnapshotFor(completedScenarioIds: readonly string[]): LostCityUnlockSnapshot {
  const completed = new Set(completedScenarioIds);
  const isLevelComplete = (level: number) => completed.has(campaignScenarioIdForLevel(level));
  return {
    grandpa: isLevelComplete(30),
    sniper: isLevelComplete(40),
    pyromaniac: isLevelComplete(50),
    salesman: isLevelComplete(60),
  };
}

function contentVersionForSnapshot(snapshot: LostCityUnlockSnapshot): string {
  return `${lostCityCampaignContentVersionPrefix}-g${Number(snapshot.grandpa)}`
    + `-s${Number(snapshot.sniper)}-p${Number(snapshot.pyromaniac)}-m${Number(snapshot.salesman)}`;
}

/** Replay identity includes the four global milestones that change map-unit visibility. */
export function lostCityCampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForSnapshot(lostCityUnlockSnapshotFor(completedScenarioIds));
}

/** Reconstructs the profile milestones represented by an exported Lost City replay. */
export function lostCityCompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-new-mexico-10-formal-v1-g([01])-s([01])-p([01])-m([01])$/.exec(contentVersion);
  if (!match) return undefined;
  const flags = match.slice(1).map((flag) => flag === '1');
  const milestones = [30, 40, 50, 60].filter((_, index) => flags[index]);
  const completedScenarioIds = milestones.map(campaignScenarioIdForLevel);
  return lostCityCampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}

export const lostCityCampaignContentVersion = lostCityCampaignContentVersionFor([]);

/** Builds the researched level 10 content for Free Play, formal campaign, and replay sessions. */
export function createLostCityCampaignContent(completedScenarioIds: readonly string[] = []): ScenarioContent {
  const completed = new Set(completedScenarioIds);
  const mapScene = createLostCityMapScene();
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId): boolean => {
    if (unitTypeId >= 1 && unitTypeId <= 4) return true;
    const completionLevel = completedLevelRequiredByUnitType[unitTypeId];
    return completionLevel !== undefined && completed.has(campaignScenarioIdForLevel(completionLevel));
  };

  return {
    id: lostCityCampaignId,
    contentVersion: lostCityCampaignContentVersionFor(completedScenarioIds),
    formalSettlementSupported: true,
    title: lostCityCampaignCopy.title,
    map: mapScene,
    originalTileGrid: map.originalTileGrid,
    units: [...createLostCityTrainUnits(), ...createLostCityMapUnits(isUnitUnlocked)],
    maxUpgrades: lostCityMaxUpgrades,
    previewWave: lostCityPreviewWave,
    campaignWaveCount: lostCityCampaignWaves.length,
    campaignWaves: lostCityCampaignWaves,
    campaignUnitPool: lostCityUnitPool,
    campaignBonusCratePool: lostCityBonusCratePool,
    campaignAwesomeEnemyTypeThreshold: lostCityCampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: lostCityBaseEnemy,
    campaignEnemyByType: lostCityEnemyByType,
  };
}
