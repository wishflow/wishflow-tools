import type { PreviewWaveDefinition } from '../game';
import { mississippi11PreviewWave } from './mississippi-11-campaign-rules';
import {
  mississippiBaseEnemy,
  mississippiCampaignAwesomeEnemyTypeThreshold,
  mississippiEnemyByType,
} from './mississippi-enemy-designs';
import { mississippi16RouteDefinitions } from './mississippi-16-routes';

export const mississippi16MaxUpgrades = 3;
export const mississippi16CampaignAwesomeEnemyTypeThreshold = mississippiCampaignAwesomeEnemyTypeThreshold;
export const mississippi16BaseEnemy = mississippiBaseEnemy;
export const mississippi16EnemyByType = mississippiEnemyByType;

const uniqueSpawns = [...new Map(mississippi16RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = mississippi16RouteDefinitions[0]!;
const uniqueExits = [...new Map(mississippi16RouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** APK level-16 start state and shared Mississippi enemy rules for Highpoint Terrace. */
export const mississippi16PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 20,
  initialCash: 365,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 110 }),
  enemy: mississippiBaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: mississippi16RouteDefinitions,
  baseEnemySpeed: mississippi11PreviewWave.baseEnemySpeed,
  speedMultiplierMin: mississippi11PreviewWave.speedMultiplierMin,
  speedMultiplierCount: mississippi11PreviewWave.speedMultiplierCount,
  escapePenalty: mississippi11PreviewWave.escapePenalty,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const mississippi16BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 10,
  rewardTypeCount: 4,
});
