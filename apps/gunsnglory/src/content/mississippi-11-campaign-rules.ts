import type { PreviewWaveDefinition } from '../game';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { mississippi11RouteDefinitions } from './mississippi-11-routes';

export const mississippi11MaxUpgrades = 3;
export const mississippi11CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const mississippi11BaseEnemy = mississippiBaseEnemy;
export const mississippi11EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(mississippi11RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = mississippi11RouteDefinitions[0]!;
const uniqueExits = [...new Map(mississippi11RouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** Original start resources and route context used for preview and campaign sessions. */
export const mississippi11PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 365,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 120 }),
  enemy: mississippi11BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: mississippi11RouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const mississippi11BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 12,
  rewardTypeCount: 4,
});
