import type { PreviewWaveDefinition } from '../game';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { dakota02RouteDefinitions } from './dakota-02-routes';

export const dakota02MaxUpgrades = 3;
export const dakota02CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const dakota02BaseEnemy = mississippiBaseEnemy;
export const dakota02EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(dakota02RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = dakota02RouteDefinitions[0]!;
const uniqueExits = [...new Map(dakota02RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** Six Grandfathers' map parameters and its APK-derived route context. */
export const dakota02PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 250,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 56, medium: 75, hard: 98 }),
  enemy: dakota02BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: dakota02RouteDefinitions,
  // The Dakota shared enemy-motion baseline; wave-specific speed percentages are below.
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const dakota02BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 15,
  rewardTypeCount: 4,
});
