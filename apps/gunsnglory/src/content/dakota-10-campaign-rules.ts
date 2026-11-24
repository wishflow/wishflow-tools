import type { PreviewWaveDefinition } from '../game';
import {
  dakota05BaseEnemy,
  dakota05EnemyByType,
  dakota05PreviewWave,
} from './dakota-05-campaign-rules';
import { dakota10RouteDefinitions } from './dakota-10-routes';

/** Original GameDesignData row 39; index 5 is retained because no consumer was found. */
export const dakota10RawLevelParameters = Object.freeze([
  250, 25, 999, 25_000, 3, 30_000, 5, 15, 56, 75, 110, 119_000,
] as const);

export const dakota10LevelParameters = Object.freeze({
  initialCash: 250,
  initialLives: 25,
  maxChests: 999,
  chestTimeMs: 25_000,
  maxUpgrades: 3,
  reservedParameter5: 30_000,
  awesomeMessageUnit: 5,
  maxChestsPlayfield: 15,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 110 }),
  gamblerTimeMs: 119_000,
});

export const dakota10MaxUpgrades = dakota10LevelParameters.maxUpgrades;
export const dakota10CampaignAwesomeEnemyTypeThreshold = dakota10LevelParameters.awesomeMessageUnit;
export const dakota10BaseEnemy = dakota05BaseEnemy;
export const dakota10EnemyByType = dakota05EnemyByType;

const uniqueSpawns = [...new Map(dakota10RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota10RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota10RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Sioux Falls opening values and the shared Dakota enemy movement baseline. */
export const dakota10PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: dakota10LevelParameters.initialLives,
  initialCash: dakota10LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: dakota10LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: dakota10BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota10RouteDefinitions,
  baseEnemySpeed: dakota05PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota05PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota05PreviewWave.speedMultiplierCount,
  escapePenalty: dakota05PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota10BonusCratePool = Object.freeze({
  totalCount: dakota10LevelParameters.maxChests,
  intervalMs: dakota10LevelParameters.chestTimeMs,
  simultaneousLimit: dakota10LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 4,
});
