import type { PreviewWaveDefinition } from '../game';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { oregon11RouteDefinitions } from './oregon-11-routes';

export const oregon11MaxUpgrades = 3;
export const oregon11CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const oregon11BaseEnemy = mississippiBaseEnemy;
export const oregon11EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(oregon11RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = oregon11RouteDefinitions[0]!;
const uniqueExits = [...new Map(oregon11RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Loot Lakes start values and its TDM-derived route context. */
export const oregon11PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 250,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 100 }),
  enemy: oregon11BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: oregon11RouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const oregon11BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 15,
  rewardTypeCount: 4,
});
