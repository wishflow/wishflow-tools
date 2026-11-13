import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { oregon05RouteDefinitions } from './oregon-05-routes';

export const oregon05MaxUpgrades = 3;
export const oregon05CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const oregon05BaseEnemy = mississippiBaseEnemy;
export const oregon05EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(oregon05RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = oregon05RouteDefinitions[0]!;
const uniqueExits = [...new Map(oregon05RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** APK level-25 opening state and shared Oregon/Mississippi enemy rules for Dynamite Plains. */
export const oregon05PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 1,
  initialCash: 65,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 86, medium: 115, hard: 140 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: oregon05RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const oregon05BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 15,
  rewardTypeCount: 4,
});
