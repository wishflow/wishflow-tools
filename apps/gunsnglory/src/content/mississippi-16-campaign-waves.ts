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

/** Eight source-ordered APK waves; unused Boss/Doc request slots are explicit zeros. */
export const mississippi16CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_000, requests: [1, 1, 1, 2, 3, 2, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_000, requests: [1, 1, 1, 2, 3, 2, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 2, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 2, intervalMs: 2_000, requests: [1, 1, 2, 2, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_000, requests: [1, 1, 1, 2, 3, 2, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 3, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 2, 1, 2, 3, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_000, requests: [1, 1, 2, 2, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_000, requests: [1, 1, 1, 2, 3, 2, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 4, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [1, 2, 1, 2, 3, 3, 1, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 2_000, requests: [1, 1, 2, 2, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 2_000, requests: [1, 1, 1, 2, 3, 2, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 5, delayMs: 6_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 4, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 5, intervalMs: 2_500, requests: [1, 2, 1, 2, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 6, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 150,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 0, 1, 1, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 0, 1, 1, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 4, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 5, intervalMs: 2_500, requests: [1, 2, 1, 2, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 7, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 0, 1, 1, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 0, 1, 0, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 4_000, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 3, intervalMs: 3_500, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 4, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 3, 1, 0, 0, 0] },
      { spawnPointId: 5, intervalMs: 2_500, requests: [1, 2, 1, 2, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 8, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 120,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 0, 1, 1, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 0, 1, 0, 2, 3, 2, 1, 0, 0] },
      { spawnPointId: 2, intervalMs: 4_000, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 3, intervalMs: 3_500, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 4, intervalMs: 4_000, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
      { spawnPointId: 5, intervalMs: 3_500, requests: [1, 1, 0, 0, 3, 3, 2, 1, 0, 0] },
    ],
  }),
]);
