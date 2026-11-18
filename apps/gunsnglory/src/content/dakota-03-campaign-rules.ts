import type { PreviewWaveDefinition } from '../game';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { dakota03RouteDefinitions } from './dakota-03-routes';

export const dakota03MaxUpgrades = 3;
export const dakota03CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const dakota03BaseEnemy = mississippiBaseEnemy;
export const dakota03EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(dakota03RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota03RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota03RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Fort Knockout's level data and shared Dakota enemy-motion baseline. */
export const dakota03PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 300,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 90 }),
  enemy: dakota03BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota03RouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota03BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 15,
  // Four reward categories are supported by the existing shared crate rules.
  rewardTypeCount: 4,
});
