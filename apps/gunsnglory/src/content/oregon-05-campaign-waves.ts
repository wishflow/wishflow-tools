import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon05SpawnPointIdByActionId } from './oregon-05-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon05SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Dynamite Plains has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Dynamite Plains APK addToWave data must contain eight request types');
  return Object.freeze({
    spawnPointId,
    intervalMs,
    requests: Object.freeze([...requestCounts, 0, bossCount]),
  });
}

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze(pool))),
  });
}

/** Nine source-ordered APK waves; action IDs map to the TDM-derived row-major spawn IDs. */
export const oregon05CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 3_000, hitPointMultiplierPercent: 50, speedMultiplierPercent: 100,
    spawnPools: [createSpawnPool(2, 1_000, [0, 0, 0, 0, 0, 0, 0, 1])],
  }),
  createWave({
    number: 2, delayMs: 5_000, hitPointMultiplierPercent: 50, speedMultiplierPercent: 105,
    spawnPools: [
      createSpawnPool(1, 1_000, [0, 0, 0, 0, 0, 0, 0, 1]),
      createSpawnPool(3, 5_000, [0, 0, 0, 0, 0, 0, 0, 1]),
    ],
  }),
  createWave({
    number: 3, delayMs: 10_000, hitPointMultiplierPercent: 80, speedMultiplierPercent: 110,
    spawnPools: [
      createSpawnPool(2, 2_000, [1, 1, 1, 1, 2, 0, 1, 0]),
      createSpawnPool(3, 2_000, [1, 1, 2, 1, 2, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 10_000, hitPointMultiplierPercent: 85, speedMultiplierPercent: 115,
    spawnPools: [
      createSpawnPool(0, 2_000, [1, 1, 1, 1, 2, 0, 1, 0]),
      createSpawnPool(1, 2_000, [1, 1, 2, 1, 2, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 90, speedMultiplierPercent: 120,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 0, 0, 0, 0, 0, 1]),
      createSpawnPool(1, 2_500, [0, 0, 0, 0, 0, 0, 0, 1]),
      createSpawnPool(2, 2_500, [0, 0, 0, 0, 0, 0, 0, 1]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 0, 0, 6, 0, 1, 0]),
      createSpawnPool(1, 2_500, [0, 0, 0, 0, 7, 0, 0, 0]),
      createSpawnPool(2, 2_500, [0, 0, 0, 0, 7, 0, 0, 0]),
      createSpawnPool(3, 2_500, [0, 0, 0, 0, 6, 0, 1, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 105, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 1, 4, 3, 0, 0, 0, 0]),
      createSpawnPool(1, 2_500, [1, 1, 4, 3, 0, 0, 0, 1]),
      createSpawnPool(2, 2_500, [1, 1, 4, 3, 0, 0, 0, 0]),
      createSpawnPool(3, 2_500, [1, 1, 3, 3, 0, 0, 0, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 105, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 3_500, [2, 3, 1, 1, 4, 2, 0, 0]),
      createSpawnPool(1, 3_500, [2, 2, 0, 3, 4, 2, 1, 0]),
      createSpawnPool(2, 3_500, [2, 1, 2, 3, 4, 2, 0, 0]),
      createSpawnPool(3, 3_500, [1, 2, 1, 3, 4, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 9, delayMs: 25_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 140,
    spawnPools: [createSpawnPool(0, 3_000, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);
