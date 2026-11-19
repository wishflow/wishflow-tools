import type { PreviewWaveDefinition } from '../game';
import {
  dakota03BaseEnemy,
  dakota03CampaignAwesomeEnemyTypeThreshold,
  dakota03EnemyByType,
  dakota03PreviewWave,
} from './dakota-03-campaign-rules';
import { dakota04RouteDefinitions } from './dakota-04-routes';

/** Values read from GameDesignData index 33; unsupported message/Gambler effects stay data-only. */
export const dakota04LevelParameters = Object.freeze({
  initialCash: 300,
  initialLives: 25,
  maxChests: 999,
  chestTimeMs: 25_000,
  maxUpgrades: 3,
  awesomeMessageMinMs: 30_000,
  awesomeMessageUnit: 5,
  maxChestsPlayfield: 15,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 110 }),
  gamblerTimeMs: 119_000,
});

export const dakota04MaxUpgrades = dakota04LevelParameters.maxUpgrades;
export const dakota04CampaignAwesomeEnemyTypeThreshold = dakota03CampaignAwesomeEnemyTypeThreshold;
export const dakota04BaseEnemy = dakota03BaseEnemy;
export const dakota04EnemyByType = dakota03EnemyByType;

const uniqueSpawns = [...new Map(dakota04RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota04RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota04RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Badlands level data and shared Dakota enemy-motion baseline. */
export const dakota04PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: dakota04LevelParameters.initialLives,
  initialCash: dakota04LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: dakota04LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: dakota04BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota04RouteDefinitions,
  baseEnemySpeed: dakota03PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota03PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota03PreviewWave.speedMultiplierCount,
  escapePenalty: dakota03PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota04BonusCratePool = Object.freeze({
  totalCount: dakota04LevelParameters.maxChests,
  intervalMs: dakota04LevelParameters.chestTimeMs,
  simultaneousLimit: dakota04LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 4,
});
