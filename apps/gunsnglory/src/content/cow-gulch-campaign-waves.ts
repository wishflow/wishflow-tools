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

/** Original Cow Gulch waves 1–8 transcribed from the APK's raw GameDesignWaves rows. */
export const cowGulchCampaignWavesP1d: readonly CampaignWaveDefinition[] = Object.freeze([
  ...cowGulchCampaignWavesP1c,
  Object.freeze({
    number: 4,
    hitPointMultiplierPercent: 70,
    speedMultiplierPercent: 105,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 2500,
      requests: Object.freeze([1, 3, 4, 4, 0, 2, 0, 0, 0, 0]),
    })]),
  }),
  Object.freeze({
    number: 5,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 105,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 2500,
      requests: Object.freeze([2, 3, 4, 5, 0, 3, 0, 0, 0, 0]),
    })]),
  }),
  Object.freeze({
    number: 6,
    hitPointMultiplierPercent: 110,
    speedMultiplierPercent: 120,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 2500,
      requests: Object.freeze([2, 2, 3, 3, 0, 4, 0, 0, 0, 0]),
    })]),
  }),
  Object.freeze({
    number: 7,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 105,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 2500,
      requests: Object.freeze([1, 2, 4, 4, 0, 5, 0, 0, 0, 0]),
    })]),
  }),
  Object.freeze({
    number: 8,
    hitPointMultiplierPercent: 130,
    speedMultiplierPercent: 110,
    spawnPools: Object.freeze([Object.freeze({
      spawnPointId: 0,
      intervalMs: 2250,
      requests: Object.freeze([1, 3, 5, 5, 0, 6, 0, 0, 0, 0]),
    })]),
  }),
]);
