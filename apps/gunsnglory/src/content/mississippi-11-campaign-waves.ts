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

/*
 * GameDesignWaves.setWaves references three Android/support-library constants for
 * wave values. Their resolved values are represented here as gameplay numbers:
 * 5,000 for wave 6's delay, 250 for that wave's HP multiplier, and 3,000 for
 * wave 4's request interval.
 */
const WAVE_SIX_DELAY_MS = 5_000;
const WAVE_SIX_HP_MULTIPLIER_PERCENT = 250;
const WAVE_FOUR_REQUEST_INTERVAL_MS = 3_000;

/** Eight source-ordered APK waves, with both unused Boss/Doc slots preserved. */
export const mississippi11CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1,
    delayMs: 20_000,
    hitPointMultiplierPercent: 325,
    speedMultiplierPercent: 110,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [1, 1, 2, 2, 0, 0, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 2,
    delayMs: 8_000,
    hitPointMultiplierPercent: 330,
    speedMultiplierPercent: 105,
    spawnPools: [{ spawnPointId: 0, intervalMs: 2_000, requests: [1, 1, 2, 2, 2, 0, 0, 0, 0, 0] }],
  }),
  createWave({
    number: 3,
    delayMs: 8_000,
    hitPointMultiplierPercent: 280,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 2_500, requests: [0, 1, 1, 1, 2, 1, 0, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 2_500, requests: [1, 2, 1, 2, 3, 1, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 4,
    delayMs: 10_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 2, intervalMs: WAVE_FOUR_REQUEST_INTERVAL_MS, requests: [1, 0, 2, 2, 3, 2, 0, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: WAVE_FOUR_REQUEST_INTERVAL_MS, requests: [1, 2, 2, 2, 3, 2, 0, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 5,
    delayMs: 6_000,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 3_500, requests: [0, 0, 1, 2, 2, 2, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 0, 1, 2, 2, 2, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 6,
    delayMs: WAVE_SIX_DELAY_MS,
    hitPointMultiplierPercent: WAVE_SIX_HP_MULTIPLIER_PERCENT,
    speedMultiplierPercent: 105,
    spawnPools: [
      { spawnPointId: 1, intervalMs: 3_500, requests: [0, 0, 1, 1, 2, 3, 2, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 3_500, requests: [0, 2, 1, 0, 2, 3, 2, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 7,
    delayMs: WAVE_SIX_DELAY_MS,
    hitPointMultiplierPercent: 200,
    speedMultiplierPercent: 100,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 4_000, requests: [1, 1, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 1, 0, 0, 3, 3, 1, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 4_000, requests: [0, 2, 0, 0, 3, 3, 1, 0, 0, 0] },
    ],
  }),
  createWave({
    number: 8,
    delayMs: WAVE_SIX_DELAY_MS,
    hitPointMultiplierPercent: 235,
    speedMultiplierPercent: 110,
    spawnPools: [
      { spawnPointId: 0, intervalMs: 4_000, requests: [1, 1, 0, 0, 3, 4, 3, 0, 0, 0] },
      { spawnPointId: 1, intervalMs: 3_500, requests: [1, 1, 0, 0, 3, 3, 2, 0, 0, 0] },
      { spawnPointId: 2, intervalMs: 3_500, requests: [0, 2, 0, 0, 3, 4, 3, 0, 0, 0] },
      { spawnPointId: 3, intervalMs: 4_000, requests: [0, 2, 0, 0, 3, 3, 2, 0, 0, 0] },
    ],
  }),
]);
