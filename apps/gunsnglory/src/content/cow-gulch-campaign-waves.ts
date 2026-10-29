import type { CampaignWaveDefinition } from '../game';

/** First two Cow Gulch schedules transcribed from the APK's raw GameDesignWaves rows. */
export const cowGulchCampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  Object.freeze({
    number: 1,
    hitPointMultiplierPercent: 70,
    speedMultiplierPercent: 100,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 1500,
      requests: Object.freeze([6, 2, 2, 0, 0, 0, 0, 0, 0, 0]),
    })]),
  }),
  Object.freeze({
    number: 2,
    hitPointMultiplierPercent: 75,
    speedMultiplierPercent: 100,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 2000,
      requests: Object.freeze([0, 2, 2, 3, 0, 0, 0, 0, 0, 0]),
    })]),
  }),
]);

/** P1-C adds the original third-wave covered-wagon pair request. */
export const cowGulchCampaignWavesP1c: readonly CampaignWaveDefinition[] = Object.freeze([
  ...cowGulchCampaignWaves,
  Object.freeze({
    number: 3,
    hitPointMultiplierPercent: 60,
    speedMultiplierPercent: 100,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 3000,
      intervalMultiplier: 2,
      requests: Object.freeze([0, 0, 0, 0, 0, 3, 0, 0, 0, 0]),
    })]),
  }),
]);
