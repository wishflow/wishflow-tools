import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { mississippi20SpawnPointIdByActionId } from './mississippi-20-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
): CampaignSpawnPoolDefinition {
  const spawnPointId = mississippi20SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Horse Hills has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Horse Hills APK addToWave data must contain eight request types');
  return Object.freeze({ spawnPointId, intervalMs, requests: Object.freeze([...requestCounts, 0, 0]) });
}

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze(pool))),
  });
}

/** Eight source-ordered APK waves; action IDs map to row-major spawn indices. */
export const mississippi20CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 0, 4, 0, 0, 0]),
      createSpawnPool(1, 2_000, [0, 0, 0, 0, 4, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 2, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 160,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 0, 4, 1, 0, 0]),
      createSpawnPool(1, 2_000, [0, 0, 0, 0, 4, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 3, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 170,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 0, 0, 4, 2, 1, 0]),
      createSpawnPool(1, 2_500, [0, 0, 0, 0, 4, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 180,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 0, 5, 3, 2, 0]),
      createSpawnPool(1, 2_000, [0, 0, 0, 0, 5, 3, 2, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 190,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 0, 5, 4, 3, 0]),
      createSpawnPool(1, 2_000, [0, 0, 0, 0, 5, 4, 3, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 200,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 0, 0, 5, 4, 3, 1]),
      createSpawnPool(1, 2_500, [0, 0, 0, 0, 5, 4, 3, 1]),
    ],
  }),
  createWave({
    number: 7, delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 210,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 0, 0, 5, 5, 4, 1]),
      createSpawnPool(1, 2_500, [0, 0, 0, 0, 5, 5, 4, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 250,
    spawnPools: [
      createSpawnPool(0, 3_500, [0, 0, 0, 0, 5, 5, 5, 1]),
      createSpawnPool(1, 3_500, [0, 0, 0, 0, 5, 5, 5, 1]),
    ],
  }),
]);
