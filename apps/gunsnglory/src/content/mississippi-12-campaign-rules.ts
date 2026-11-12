import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { mississippi12RouteDefinitions } from './mississippi-12-routes';

export const mississippi12MaxUpgrades = 3;
export const mississippi12CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;

const uniqueSpawns = [...new Map(mississippi12RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = mississippi12RouteDefinitions[0]!;
const uniqueExits = [...new Map(mississippi12RouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** APK level-12 start state and global enemy table for Steam Valley. */
export const mississippi12PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 365,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 130 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: mississippi12RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const mississippi12BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 10,
  rewardTypeCount: 4,
});

/** Mississippi levels share the global APK enemy design table. */
export const mississippi12BaseEnemy = mississippiBaseEnemy;
export const mississippi12EnemyByType = mississippiEnemyByType;
