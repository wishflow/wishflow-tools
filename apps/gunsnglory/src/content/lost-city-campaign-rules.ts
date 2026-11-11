import type { CampaignEnemyType, PreviewEnemyDefinition, PreviewWaveDefinition } from '../game';
import { lostCityExits, lostCityRedirects, lostCityRouteDefinitions, lostCitySpawnPoints } from './lost-city-routes';

export const lostCityMaxUpgrades = 3;
export const lostCityCampaignAwesomeEnemyTypeThreshold = 5;

export const lostCityBaseEnemy: PreviewEnemyDefinition = Object.freeze({
  hitPoints: 18,
  cashReward: 1,
  penetration: Object.freeze({ light: 100, fire: 50, heavy: 25, poison: 75 }),
});

export const lostCityEnemyByType: Partial<Readonly<Record<CampaignEnemyType, PreviewEnemyDefinition>>> = Object.freeze({
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

/** Original start resources and four-way route context for preview and campaign sessions. */
export const lostCityPreviewWave: PreviewWaveDefinition = Object.freeze({
  number: 1,
  initialLives: 25,
  initialCash: 350,
  enemyHitPointMultiplierPercentByDifficulty: Object.freeze({ easy: 75, medium: 150, hard: 188 }),
  enemy: lostCityBaseEnemy,
  spawn: lostCitySpawnPoints[0]!,
  additionalSpawns: Object.freeze(lostCitySpawnPoints.slice(1)),
  routes: lostCityRouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: lostCityRedirects,
  exit: lostCityExits[0]!,
  additionalExits: Object.freeze(lostCityExits.slice(1)),
});

export const lostCityBonusCratePool = Object.freeze({
  totalCount: 999,
  intervalMs: 25_000,
  simultaneousLimit: 32,
  rewardTypeCount: 4,
});
