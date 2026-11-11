import type { CampaignEnemyType, PreviewEnemyDefinition, PreviewWaveDefinition } from '../game';
import { mississippi11RouteDefinitions } from './mississippi-11-routes';

export const mississippi11MaxUpgrades = 3;
export const mississippi11CampaignAwesomeEnemyTypeThreshold = 5;

export const mississippi11BaseEnemy: PreviewEnemyDefinition = Object.freeze({
  hitPoints: 18,
  cashReward: 1,
  penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
});

/** Global APK enemy design rows used by Traveller’s Town’s campaign waves. */
export const mississippi11EnemyByType: Partial<Readonly<Record<CampaignEnemyType, PreviewEnemyDefinition>>> = Object.freeze({
  3: Object.freeze({
    hitPoints: 60,
    cashReward: 2,
    penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
    turningDurationMs: 100,
  }),
  4: Object.freeze({
    hitPoints: 200,
    cashReward: 10,
    penetration: Object.freeze({ light: 50, fire: 100, heavy: 66, poison: 100 }),
    turningDurationMs: 200,
  }),
  5: Object.freeze({
    hitPoints: 300,
    cashReward: 15,
    penetration: Object.freeze({ light: 50, fire: 100, heavy: 66, poison: 100 }),
    turningDurationMs: 100,
  }),
  6: Object.freeze({
    hitPoints: 500,
    cashReward: 25,
    penetration: Object.freeze({ light: 33, fire: 25, heavy: 100, poison: 100 }),
    turningDurationMs: 200,
  }),
  8: Object.freeze({
    hitPoints: 200,
    cashReward: 0,
    penetration: Object.freeze({ light: 100, fire: 100, heavy: 100, poison: 100 }),
    turningDurationMs: 100,
  }),
});

const uniqueSpawns = [...new Map(mississippi11RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const firstRoute = mississippi11RouteDefinitions[0]!;
const uniqueExits = [...new Map(mississippi11RouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];

/** Original start resources and route context used for preview and campaign sessions. */
export const mississippi11PreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 365,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 100, hard: 120 }),
  enemy: mississippi11BaseEnemy,
  spawn: uniqueSpawns[0]!,
  additionalSpawns: Object.freeze(uniqueSpawns.slice(1)),
  routes: mississippi11RouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: Object.freeze(uniqueExits.slice(1)),
});

export const mississippi11BonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 12,
  rewardTypeCount: 4,
});
