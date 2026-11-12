import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { mississippi18SpawnPointIdByActionId } from './mississippi-18-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
): CampaignSpawnPoolDefinition {
  const spawnPointId = mississippi18SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Shadow Town has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Shadow Town APK addToWave data must contain eight request types');
  return Object.freeze({ spawnPointId, intervalMs, requests: Object.freeze([...requestCounts, 0, 0]) });
}

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze(pool))),
  });
}

/** Eight source-ordered APK waves; action IDs map to row-major spawn indices. */
export const mississippi18CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100,
    spawnPools: [
      createSpawnPool(0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(1, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 2, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 105,
    spawnPools: [
      createSpawnPool(0, 2_000, [1, 1, 2, 2, 2, 3, 1, 0]),
      createSpawnPool(1, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 3, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 100,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0]),
      createSpawnPool(2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0]),
      createSpawnPool(3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 115,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0]),
      createSpawnPool(2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0]),
      createSpawnPool(3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0]),
      createSpawnPool(2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0]),
      createSpawnPool(3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(5, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 5_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0]),
      createSpawnPool(2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0]),
      createSpawnPool(3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(5, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0]),
      createSpawnPool(2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0]),
      createSpawnPool(3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
      createSpawnPool(5, 2_000, [1, 1, 1, 2, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 8, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110,
    spawnPools: [
      createSpawnPool(0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1]),
      createSpawnPool(1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1]),
      createSpawnPool(2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1]),
      createSpawnPool(3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1]),
      createSpawnPool(4, 4_000, [1, 1, 0, 0, 3, 3, 2, 1]),
      createSpawnPool(5, 3_500, [1, 1, 0, 0, 3, 3, 2, 1]),
    ],
  }),
]);
