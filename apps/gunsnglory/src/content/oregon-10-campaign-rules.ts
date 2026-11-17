import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { oregon10RouteDefinitions } from './oregon-10-routes';

export const oregon10MaxUpgrades = 3;
export const oregon10CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const oregon10BaseEnemy = mississippiBaseEnemy;
export const oregon10EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(oregon10RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = oregon10RouteDefinitions[0]!;
const uniqueExits = [...new Map(oregon10RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** APK level-30 economy and difficulty values with the complete TDM-derived route graph. */
export const oregon10PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 400,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 86, medium: 115, hard: 175 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: oregon10RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const oregon10BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 15,
  rewardTypeCount: 4,
});
