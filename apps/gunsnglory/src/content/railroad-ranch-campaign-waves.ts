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

/** Seven APK waves; each eight-slot WaveManager call is padded to the ten-slot web contract. */
export const railroadRanchCampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1,
    delayMs: 15_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 100,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [1, 1, 1, 1, 3, 2, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    delayMs: 5_000,
    hitPointMultiplierPercent: 275,
    speedMultiplierPercent: 105,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [1, 1, 1, 1, 1, 3, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 3,
    delayMs: 10_000,
    hitPointMultiplierPercent: 300,
    speedMultiplierPercent: 105,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [0, 0, 1, 1, 2, 3, 2, 0, 0, 0] }],
  }),
  createWave({
    number: 4,
    delayMs: 5_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 0, 2, 2, 3, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [1, 0, 2, 2, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    delayMs: 5_000,
    hitPointMultiplierPercent: 250,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 0, 1, 2, 2, 2, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    delayMs: 5_000,
    hitPointMultiplierPercent: 275,
    speedMultiplierPercent: 115,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 2, 2, 2, 1, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 0, 1, 2, 2, 1, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    delayMs: 5_000,
    hitPointMultiplierPercent: 275,
    speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 0, 1, 0, 0, 3, 1, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 0, 2, 1, 0, 3, 1, 1, 0, 0] },
    ],
  }),
]);
