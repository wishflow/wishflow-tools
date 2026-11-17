import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { oregon09RouteDefinitions } from './oregon-09-routes';

export const oregon09MaxUpgrades = 3;
export const oregon09CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const oregon09BaseEnemy = mississippiBaseEnemy;
export const oregon09EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(oregon09RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = oregon09RouteDefinitions[0]!;
const uniqueExits = [...new Map(oregon09RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

/** APK level-29 economy and difficulty multipliers with the complete TDM-derived route graph. */
export const oregon09PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 50,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 82, medium: 110, hard: 150 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: oregon09RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const oregon09BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 15,
  rewardTypeCount: 4,
});
