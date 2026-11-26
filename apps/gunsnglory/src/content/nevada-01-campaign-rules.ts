import type { PreviewWaveDefinition } from '../game';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { dakota10PreviewWave } from './dakota-10-campaign-rules';
import { nevada01RouteDefinitions } from './nevada-01-routes';

export const nevada01LevelParametersRaw = Object.freeze([
  150,
  25,
  999,
  25_000,
  3,
  30_000,
  5,
  15,
  75,
  100,
  140,
  119_000,
] as const);

/** APK level-data row 40 for global campaign level 41, with confirmed fields named. */
export const nevada01LevelParameters = Object.freeze({
  initialCash: nevada01LevelParametersRaw[0],
  initialLives: nevada01LevelParametersRaw[1],
  maxChests: nevada01LevelParametersRaw[2],
  chestIntervalMs: nevada01LevelParametersRaw[3],
  maxUpgrades: nevada01LevelParametersRaw[4],
  awesomeMessageMin: nevada01LevelParametersRaw[5],
  awesomeMessageUnit: nevada01LevelParametersRaw[6],
  maxChestsPlayfield: nevada01LevelParametersRaw[7],
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({
    easy: nevada01LevelParametersRaw[8],
    medium: nevada01LevelParametersRaw[9],
    hard: nevada01LevelParametersRaw[10],
  }),
  gamblerCooldownMs: nevada01LevelParametersRaw[11],
});

export const nevada01MaxUpgrades = nevada01LevelParameters.maxUpgrades;
export const nevada01CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const nevada01BaseEnemy = mississippiBaseEnemy;
export const nevada01EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(nevada01RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = nevada01RouteDefinitions[0]!;
const uniqueExits = [...new Map(nevada01RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Labyrinth Gulch opening state with route geometry from its original TDM. */
export const nevada01PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: nevada01LevelParameters.initialLives,
  initialCash: nevada01LevelParameters.initialCash,
  enemyHitPointMultiplierPercentByDifficulty: nevada01LevelParameters.enemyHitPointMultiplierPercentByDifficulty,
  enemy: nevada01BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: nevada01RouteDefinitions,
  baseEnemySpeed: dakota10PreviewWave.baseEnemySpeed,
  speedMultiplierMin: dakota10PreviewWave.speedMultiplierMin,
  speedMultiplierCount: dakota10PreviewWave.speedMultiplierCount,
  escapePenalty: dakota10PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const nevada01BonusCratePool = Object.freeze({
  totalCount: nevada01LevelParameters.maxChests,
  intervalMs: nevada01LevelParameters.chestIntervalMs,
  simultaneousLimit: nevada01LevelParameters.maxChestsPlayfield,
  rewardTypeCount: 7,
});
