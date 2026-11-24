import type { PreviewWaveDefinition } from '../game';
import {
  dakota05BaseEnemy,
  dakota05EnemyByType,
  dakota05PreviewWave,
} from './dakota-05-campaign-rules';
import { dakota09RouteDefinitions } from './dakota-09-routes';

/** Original GameDesignData row 38; parameter 5 stays data-only until its consumer is confirmed. */
export const dakota09RawLevelParameters = Object.freeze([
  250, 10, 999, 25_000, 3, 30_000, 5, 15, 56, 75, 100, 119_000,
] as const);

export const dakota09LevelParameters = Object.freeze({
  initialCash: 250,
  initialLives: 10,
  maxChests: 999,
  chestTimeMs: 25_000,
  maxUpgrades: 3,
  reservedParameter5: 30_000,
  awesomeMessageUnit: 5,
  maxChestsPlayfield: 15,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 100 }),
  gamblerTimeMs: 119_000,
});

export const dakota09MaxUpgrades = dakota09LevelParameters.maxUpgrades;
export const dakota09CampaignAwesomeEnemyTypeThreshold = dakota09LevelParameters.awesomeMessageUnit;
export const dakota09BaseEnemy = dakota05BaseEnemy;
export const dakota09EnemyByType = dakota05EnemyByType;

const uniqueSpawns = [...new Map(dakota09RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota09RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota09RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Snow Town opening setup shares the APK Dakota enemy movement baseline. */
export const dakota09PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: dakota09LevelParameters.initialLives,
  initialCash: dakota09LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: dakota09LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: dakota09BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota09RouteDefinitions,
  baseEnemySpeed: dakota05PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota05PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota05PreviewWave.speedMultiplierCount,
  escapePenalty: dakota05PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota09BonusCratePool = Object.freeze({
  totalCount: dakota09LevelParameters.maxChests,
  intervalMs: dakota09LevelParameters.chestTimeMs,
  simultaneousLimit: dakota09LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 4,
});
