import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { mississippi14RouteDefinitions } from './mississippi-14-routes';

export const mississippi14MaxUpgrades = 3;
export const mississippi14CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;

const uniqueSpawns = [...new Map(mississippi14RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = mississippi14RouteDefinitions[0]!;
const uniqueExits = [...new Map(mississippi14RouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** APK level-14 start state and shared Mississippi enemy rules for Riverside Mountains. */
export const mississippi14PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 365,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 115 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: mississippi14RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const mississippi14BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 10,
  rewardTypeCount: 4,
});

export const mississippi14BaseEnemy = mississippiBaseEnemy;
export const mississippi14EnemyByType = mississippiEnemyByType;
