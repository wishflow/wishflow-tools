import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { mississippi20RouteDefinitions } from './mississippi-20-routes';

export const mississippi20MaxUpgrades = 3;
export const mississippi20CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const mississippi20BaseEnemy = mississippiBaseEnemy;
export const mississippi20EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(mississippi20RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = mississippi20RouteDefinitions[0]!;
const uniqueExits = [...new Map(mississippi20RouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** APK level-20 starting state and shared Mississippi enemy rules for Horse Hills. */
export const mississippi20PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 1,
  initialCash: 450,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 110 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: mississippi20RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const mississippi20BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 12,
  rewardTypeCount: 4,
});
