import type { PreviewWaveDefinition } from '../game';
import { dakota05BaseEnemy, dakota05EnemyByType, dakota05PreviewWave } from './dakota-05-campaign-rules';
import { dakota07RouteDefinitions } from './dakota-07-routes';

/** Values read from GameDesignData index 36; fields with unknown effects remain data-only. */
export const dakota07LevelParameters = Object.freeze({
  initialCash: 350,
  initialLives: 25,
  maxChests: 999,
  chestTimeMs: 25_000,
  maxUpgrades: 3,
  awesomeMessageMinMs: 30_000,
  awesomeMessageUnit: 5,
  maxChestsPlayfield: 15,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 110 }),
  gamblerTimeMs: 118_000,
});

export const dakota07MaxUpgrades = dakota07LevelParameters.maxUpgrades;
export const dakota07CampaignAwesomeEnemyTypeThreshold = dakota07LevelParameters.awesomeMessageUnit;
export const dakota07BaseEnemy = dakota05BaseEnemy;
export const dakota07EnemyByType = dakota05EnemyByType;

const uniqueSpawns = [...new Map(dakota07RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota07RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota07RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Frost Station's opening setup and shared Dakota enemy movement baseline. */
export const dakota07PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: dakota07LevelParameters.initialLives,
  initialCash: dakota07LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: dakota07LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: dakota07BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota07RouteDefinitions,
  baseEnemySpeed: dakota05PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota05PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota05PreviewWave.speedMultiplierCount,
  escapePenalty: dakota05PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota07BonusCratePool = Object.freeze({
  totalCount: dakota07LevelParameters.maxChests,
  intervalMs: dakota07LevelParameters.chestTimeMs,
  simultaneousLimit: dakota07LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 4,
});
