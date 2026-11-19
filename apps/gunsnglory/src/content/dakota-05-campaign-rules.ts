import type { PreviewWaveDefinition } from '../game';
import {
  dakota04BaseEnemy,
  dakota04EnemyByType,
  dakota04PreviewWave,
} from './dakota-04-campaign-rules';
import { dakota05RouteDefinitions } from './dakota-05-routes';

/** Values read from GameDesignData index 34; unused fields remain data-only until a consumer is proven. */
export const dakota05LevelParameters = Object.freeze({
  initialCash: 300,
  initialLives: 25,
  maxChests: 999,
  chestTimeMs: 25_000,
  maxUpgrades: 3,
  awesomeMessageMinMs: 30_000,
  awesomeMessageUnit: 5,
  maxChestsPlayfield: 15,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 95 }),
  gamblerTimeMs: 118_000,
});

export const dakota05MaxUpgrades = dakota05LevelParameters.maxUpgrades;
export const dakota05CampaignAwesomeEnemyTypeThreshold = dakota05LevelParameters.awesomeMessageUnit;
export const dakota05BaseEnemy = dakota04BaseEnemy;
export const dakota05EnemyByType = dakota04EnemyByType;

const uniqueSpawns = [...new Map(dakota05RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota05RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota05RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Ghost Town's opening setup and Dakota enemy-motion baseline. */
export const dakota05PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: dakota05LevelParameters.initialLives,
  initialCash: dakota05LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: dakota05LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: dakota05BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota05RouteDefinitions,
  baseEnemySpeed: dakota04PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota04PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota04PreviewWave.speedMultiplierCount,
  escapePenalty: dakota04PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota05BonusCratePool = Object.freeze({
  totalCount: dakota05LevelParameters.maxChests,
  intervalMs: dakota05LevelParameters.chestTimeMs,
  simultaneousLimit: dakota05LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 4,
});
