import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { oregon04RouteDefinitions } from './oregon-04-routes';

export const oregon04MaxUpgrades = 3;
export const oregon04CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const oregon04BaseEnemy = mississippiBaseEnemy;
export const oregon04EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(oregon04RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = oregon04RouteDefinitions[0]!;
const uniqueExits = [...new Map(oregon04RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,])).values()];

/** APK level-24 start state and shared Oregon/Mississippi enemy rules for Fort Echo. */
export const oregon04PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 250,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 86, medium: 115, hard: 140 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: oregon04RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const oregon04BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 15,
  rewardTypeCount: 4,
});
