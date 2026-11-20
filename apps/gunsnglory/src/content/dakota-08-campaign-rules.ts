import type { PreviewWaveDefinition } from '../game';
import { dakota05BaseEnemy, dakota05EnemyByType, dakota05PreviewWave } from './dakota-05-campaign-rules';
import { dakota08RouteDefinitions } from './dakota-08-routes';

/** Raw GameDesignData row 37; retained values with unresolved effects stay data-only. */
export const dakota08RawLevelParameters = Object.freeze([
  250, 25, 999, 25_000, 3, 30_000, 5, 15, 56, 75, 100, 119_000,
] as const);

export const dakota08LevelParameters = Object.freeze({
  initialCash: 250,
  initialLives: 25,
  maxChests: 999,
  chestTimeMs: 25_000,
  maxUpgrades: 3,
  reservedParameter5: 30_000,
  awesomeMessageUnit: 5,
  maxChestsPlayfield: 15,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 100 }),
  gamblerTimeMs: 119_000,
});

export const dakota08MaxUpgrades = dakota08LevelParameters.maxUpgrades;
export const dakota08CampaignAwesomeEnemyTypeThreshold = dakota08LevelParameters.awesomeMessageUnit;
export const dakota08BaseEnemy = dakota05BaseEnemy;
export const dakota08EnemyByType = dakota05EnemyByType;

const uniqueSpawns = [...new Map(dakota08RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota08RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota08RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Wayne Waters' starting values and Dakota movement baseline. */
export const dakota08PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: dakota08LevelParameters.initialLives,
  initialCash: dakota08LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: dakota08LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: dakota08BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota08RouteDefinitions,
  baseEnemySpeed: dakota05PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota05PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota05PreviewWave.speedMultiplierCount,
  escapePenalty: dakota05PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota08BonusCratePool = Object.freeze({
  totalCount: dakota08LevelParameters.maxChests,
  intervalMs: dakota08LevelParameters.chestTimeMs,
  simultaneousLimit: dakota08LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 4,
});
