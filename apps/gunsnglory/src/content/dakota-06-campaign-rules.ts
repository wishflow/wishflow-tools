import type { PreviewWaveDefinition } from '../game';
import {
  dakota05BaseEnemy,
  dakota05EnemyByType,
  dakota05PreviewWave,
} from './dakota-05-campaign-rules';
import { dakota06RouteDefinitions } from './dakota-06-routes';

/** Values read from GameDesignData index 35; unconfirmed effects remain data-only. */
export const dakota06LevelParameters = Object.freeze({
  initialCash: 200,
  initialLives: 25,
  maxChests: 999,
  chestTimeMs: 25_000,
  maxUpgrades: 3,
  awesomeMessageMinMs: 30_000,
  awesomeMessageUnit: 5,
  maxChestsPlayfield: 15,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 125 }),
  gamblerTimeMs: 118_000,
});

export const dakota06MaxUpgrades = dakota06LevelParameters.maxUpgrades;
export const dakota06CampaignAwesomeEnemyTypeThreshold = dakota06LevelParameters.awesomeMessageUnit;
export const dakota06BaseEnemy = dakota05BaseEnemy;
export const dakota06EnemyByType = dakota05EnemyByType;

const uniqueSpawns = [...new Map(dakota06RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota06RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota06RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Ice Rocks' opening setup and shared Dakota enemy-motion baseline. */
export const dakota06PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: dakota06LevelParameters.initialLives,
  initialCash: dakota06LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: dakota06LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: dakota06BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota06RouteDefinitions,
  baseEnemySpeed: dakota05PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota05PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota05PreviewWave.speedMultiplierCount,
  escapePenalty: dakota05PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota06BonusCratePool = Object.freeze({
  totalCount: dakota06LevelParameters.maxChests,
  intervalMs: dakota06LevelParameters.chestTimeMs,
  simultaneousLimit: dakota06LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 4,
});
