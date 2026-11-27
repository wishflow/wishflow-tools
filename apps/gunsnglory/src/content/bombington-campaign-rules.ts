import type { PreviewWaveDefinition } from '../game';
import {
  nevada01BaseEnemy,
  nevada01EnemyByType,
  nevada01PreviewWave,
} from './nevada-01-campaign-rules';
import { bombingtonRouteDefinitions } from './bombington-routes';

/** Original GameDesignData row 41 for global campaign level 42. */
export const bombingtonRawLevelParameters = Object.freeze([
  300, 25, 999, 25_000, 3, 30_000, 5, 15, 75, 110, 155, 119_000,
] as const);

/** Bombington's fields named only where their APK consumers are confirmed. */
export const bombingtonLevelParameters = Object.freeze({
  initialCash: bombingtonRawLevelParameters[0],
  initialLives: bombingtonRawLevelParameters[1],
  maxChests: bombingtonRawLevelParameters[2],
  chestIntervalMs: bombingtonRawLevelParameters[3],
  maxUpgrades: bombingtonRawLevelParameters[4],
  awesomeMessageMinMs: bombingtonRawLevelParameters[5],
  awesomeMessageUnit: bombingtonRawLevelParameters[6],
  maxChestsPlayfield: bombingtonRawLevelParameters[7],
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({
    easy: bombingtonRawLevelParameters[8],
    medium: bombingtonRawLevelParameters[9],
    hard: bombingtonRawLevelParameters[10],
  }),
  gamblerCooldownMs: bombingtonRawLevelParameters[11],
});

export const bombingtonMaxUpgrades = bombingtonLevelParameters.maxUpgrades;
export const bombingtonCampaignAwesomeEnemyTypeThreshold = bombingtonLevelParameters.awesomeMessageUnit;

// The APK's enemyDesignData is shared by the campaign; Nevada Level 41 already exposes these rows.
export const bombingtonBaseEnemy = nevada01BaseEnemy;
export const bombingtonEnemyByType = nevada01EnemyByType;

const uniqueSpawns = [...new Map(bombingtonRouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = bombingtonRouteDefinitions[0]!;
const uniqueExits = [...new Map(bombingtonRouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Bombington's opening state and route geometry decoded from its APK TDM. */
export const bombingtonPreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: bombingtonLevelParameters.initialLives,
  initialCash: bombingtonLevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: bombingtonLevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: bombingtonBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: bombingtonRouteDefinitions,
  baseEnemySpeed: nevada01PreviewWave.baseEnemySpeed,
  speedMultiplierMin: nevada01PreviewWave.speedMultiplierMin,
  speedMultiplierCount: nevada01PreviewWave.speedMultiplierCount,
  escapePenalty: nevada01PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

/** The APK expands bonus-crate rewards to 1–7 from global level 41 onward. */
export const bombingtonBonusCratePool = Object.freeze({
  totalCount: bombingtonLevelParameters.maxChests,
  intervalMs: bombingtonLevelParameters.chestIntervalMs,
  simultaneousLimit: bombingtonLevelParameters.maxChestsPlayfield,
  rewardTypeCount: 7,
});
