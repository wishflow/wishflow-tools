import type { CampaignWaveDefinition } from '../game';

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze({
      ...pool,
      requests: Object.freeze([...pool.requests]),
    }))),
  });
}

/** Ten APK waves; each request keeps all eight enemy types plus the two zero slots. */
export const lostCityCampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1,
    delayMs: 15_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [1, 1, 1, 2, 3, 2, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    delayMs: 5_000,
    hitPointMultiplierPercent: 250,
    speedMultiplierPercent: 105,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [1, 1, 2, 2, 2, 3, 1, 0, 0, 0] }],
  }),
  createWave({
    number: 3,
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [1, 2, 1, 2, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 4,
    delayMs: 5_000,
    hitPointMultiplierPercent: 175,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_000, requests: [1, 0, 2, 2, 3, 4, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_000, requests: [1, 2, 2, 2, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_000, requests: [1, 0, 2, 2, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 0, 1, 2, 2, 3, 1, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [0, 0, 1, 2, 2, 2, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 0, 1, 2, 2, 2, 2, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    delayMs: 5_000,
    hitPointMultiplierPercent: 180,
    speedMultiplierPercent: 115,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 0, 1, 1, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 0, 1, 0, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 2, 1, 0, 2, 3, 2, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 4_000, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 2, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 3, intervalMs: 4_000, requests: [0, 2, 0, 0, 3, 3, 2, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    delayMs: 5_000,
    hitPointMultiplierPercent: 225,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 4_000, requests: [1, 1, 0, 0, 3, 4, 3, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 1, 0, 0, 3, 4, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 2, 0, 0, 3, 4, 3, 1, 0, 0] },
      { spawnPointId: 3, intervalMs: 4_000, requests: [0, 2, 0, 0, 3, 4, 2, 1, 0, 0] },
    ],
  }),
  createWave({
    number: 9,
    delayMs: 5_000,
    hitPointMultiplierPercent: 250,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 6_000, requests: [0, 0, 0, 0, 0, 0, 0, 3, 0, 0] },
      { spawnPointId: 1, intervalMs: 6_500, requests: [0, 0, 0, 0, 0, 0, 0, 3, 0, 0] },
      { spawnPointId: 2, intervalMs: 6_500, requests: [0, 0, 0, 0, 0, 0, 0, 3, 0, 0] },
      { spawnPointId: 3, intervalMs: 6_000, requests: [0, 0, 0, 0, 0, 0, 0, 3, 0, 0] },
    ],
  }),
  createWave({
    number: 10,
    delayMs: 5_000,
    hitPointMultiplierPercent: 280,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 4_000, requests: [1, 1, 0, 0, 5, 4, 3, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 1, 0, 0, 5, 4, 2, 2, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 2, 0, 0, 5, 4, 3, 1, 0, 0] },
      { spawnPointId: 3, intervalMs: 4_000, requests: [0, 2, 0, 0, 5, 4, 3, 2, 0, 0] },
    ],
  }),
]);
