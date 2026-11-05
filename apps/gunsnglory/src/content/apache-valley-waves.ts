import type { CampaignWaveDefinition } from '../game';

/** Six original Apache Valley wave schedules transcribed from GameDesignWaves.smali. */
export const apacheValleyCampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  {
    number: 1,
    delayMs: 15_000,
    hitPointMultiplierPercent: 75,
    speedMultiplierPercent: 100,
    spawnPools: [0, 1].map((spawnPointId) => ({
      spawnPointId,
      intervalMs: 3_000,
      requests: [5, 5, 5, 5, 3, 3, 0, 0, 0, 0],
    })),
  },
  {
    number: 2,
    delayMs: 10_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 100,
    spawnPools: [0, 1].map((spawnPointId) => ({
      spawnPointId,
      intervalMs: 3_000,
      requests: [4, 4, 5, 7, 5, 4, 0, 0, 0, 0],
    })),
  },
  {
    number: 3,
    delayMs: 25_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 100,
    spawnPools: [{
      spawnPointId: 2,
      intervalMs: 3_000,
      requests: [2, 2, 2, 4, 8, 8, 0, 0, 0, 0],
    }],
  },
  {
    number: 4,
    delayMs: 25_000,
    hitPointMultiplierPercent: 175,
    speedMultiplierPercent: 90,
    spawnPools: [0, 1, 2].map((spawnPointId) => ({
      spawnPointId,
      intervalMs: 3_500,
      requests: [3, 3, 6, 8, 6, 6, 0, 0, 0, 0],
    })),
  },
  {
    number: 5,
    delayMs: 10_000,
    hitPointMultiplierPercent: 225,
    speedMultiplierPercent: 100,
    spawnPools: [
      ...[0, 1].map((spawnPointId) => ({
        spawnPointId,
        intervalMs: 3_000,
        requests: [3, 3, 5, 7, 8, 8, 0, 0, 0, 0],
      })),
      { spawnPointId: 2, intervalMs: 3_500, requests: [3, 3, 5, 6, 7, 7, 0, 0, 0, 0] },
    ],
  },
  {
    number: 6,
    delayMs: 10_000,
    hitPointMultiplierPercent: 250,
    speedMultiplierPercent: 105,
    spawnPools: [
      ...[0, 1].map((spawnPointId) => ({
        spawnPointId,
        intervalMs: 3_000,
        requests: [2, 2, 4, 6, 7, 7, 0, 0, 0, 0],
      })),
      { spawnPointId: 2, intervalMs: 3_500, requests: [2, 2, 3, 5, 6, 6, 0, 0, 0, 0] },
    ],
  },
]);
