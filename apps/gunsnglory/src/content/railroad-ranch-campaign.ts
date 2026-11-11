import type { PreviewEnemyDefinition, PreviewWaveDefinition, ScenarioContent } from '../game';
import { createRailroadRanchDynamiteDefinition } from './railroad-ranch-dynamite';
import {
  railroadRanchExits,
  railroadRanchRedirects,
  railroadRanchRouteDefinitions,
  railroadRanchSpawnPoints,
} from './railroad-ranch-routes';
import { createRailroadRanchMapScene } from './railroad-ranch-scene';
import { createRailroadRanchTrainUnits } from './railroad-ranch-units';
import { railroadRanchCampaignWaves } from './railroad-ranch-campaign-waves';
import { isDynamiteUnlocked } from './dynamite';
import map from './new-mexico-09.json';

export const railroadRanchCampaignId = 'campaign-new-mexico-09';
const railroadRanchContentVersionPrefix = 'gng-free-1.8.6-new-mexico-09-formal-v1';

function contentVersionForDynamiteSnapshot(dynamiteUnlocked: boolean): string {
  return `${railroadRanchContentVersionPrefix}-d${Number(dynamiteUnlocked)}`;
}

/** Stable replay identity for map09's profile-dependent dynamite visibility. */
export function railroadRanchCampaignContentVersionFor(completedScenarioIds: readonly string[]): string {
  return contentVersionForDynamiteSnapshot(isDynamiteUnlocked(completedScenarioIds));
}

/** Reconstructs the milestone represented by an exported map09 dynamite snapshot. */
export function railroadRanchCompletedScenarioIdsForContentVersion(contentVersion: string): string[] | undefined {
  const match = /^gng-free-1\.8\.6-new-mexico-09-formal-v1-d([01])$/.exec(contentVersion);
  if (!match) return undefined;
  const completedScenarioIds = match[1] === '1' ? ['campaign-mississippi-10'] : [];
  return railroadRanchCampaignContentVersionFor(completedScenarioIds) === contentVersion
    ? completedScenarioIds
    : undefined;
}

export const railroadRanchCampaignContentVersion = railroadRanchCampaignContentVersionFor([]);

const baseEnemy: PreviewEnemyDefinition = Object.freeze({
  hitPoints: 18,
  cashReward: 1,
  penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
});

/** Original start state and route context used by preview, Free Play, and campaign sessions. */
export const railroadRanchPreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 600,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 125 }),
  enemy: baseEnemy,
  spawn: railroadRanchSpawnPoints[0]!,
  additionalSpawns: Object.freeze(railroadRanchSpawnPoints.slice(1)),
  routes: railroadRanchRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: railroadRanchRedirects,
  exit: railroadRanchExits[0]!,
  additionalExits: Object.freeze(railroadRanchExits.slice(1)),
});

/**
 * Assembles researched map09 rules for tests and later campaign registration.
 * No player SpawnPoolManager actions exist for this map; its activity-4 train wagons are the hireable units.
 */
export function createRailroadRanchCampaignContent(
  completedScenarioIds: readonly string[] = [],
): ScenarioContent {
  return {
    ...map,
    id: railroadRanchCampaignId,
    contentVersion: railroadRanchCampaignContentVersionFor(completedScenarioIds),
    title: { en: 'Railroad Ranch · Level 9', zh: '铁路牧场 · 第 9 关' },
    formalSettlementSupported: true,
    map: createRailroadRanchMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createRailroadRanchTrainUnits(),
    maxUpgrades: 3,
    previewWave: railroadRanchPreviewWave,
    campaignWaveCount: railroadRanchCampaignWaves.length,
    campaignWaves: railroadRanchCampaignWaves,
    dynamite: createRailroadRanchDynamiteDefinition(completedScenarioIds),
    campaignEnemy: baseEnemy,
    campaignAwesomeEnemyTypeThreshold: 5,
  };
}
