import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { mississippi18RouteDefinitions } from './mississippi-18-routes';

export const mississippi18MaxUpgrades = 3;
export const mississippi18CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const mississippi18BaseEnemy = mississippiBaseEnemy;
export const mississippi18EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(mississippi18RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = mississippi18RouteDefinitions[0]!;
const uniqueExits = [...new Map(mississippi18RouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** APK level-18 start state and shared Mississippi enemy rules for Shadow Town. */
export const mississippi18PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 20,
  initialCash: 425,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 110 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: mississippi18RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const mississippi18BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 16,
  rewardTypeCount: 4,
});
