import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon10SpawnPointIdByActionId } from './oregon-10-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon10SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Lumber Mill Hills has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Lumber Mill Hills APK addToWave data must contain eight request types');
  return Object.freeze({
    spawnPointId,
    intervalMs,
    requests: Object.freeze([...requestCounts, bossCount, 0]),
  });
}

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze(pool))),
  });
}

/** Ten source-ordered APK waves; Boss remains separate in request index 8. */
export const oregon10CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(2, 2_000, [2, 2, 2, 3, 2, 3, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(2, 2_000, [2, 2, 2, 3, 2, 3, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(2, 2_500, [3, 3, 2, 3, 2, 3, 1, 0]),
      createSpawnPool(3, 3_000, [3, 3, 1, 1, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(2, 2_500, [1, 2, 2, 3, 2, 2, 1, 0]),
      createSpawnPool(3, 2_500, [1, 2, 1, 1, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    spawnPools: [createSpawnPool(1, 2_500, [1, 2, 2, 3, 2, 3, 2, 0])],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 3, 3, 2, 2, 2, 0]),
      createSpawnPool(1, 2_500, [1, 2, 2, 3, 2, 2, 2, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 3, 3, 3, 2, 1, 1]),
      createSpawnPool(1, 2_500, [1, 2, 2, 3, 3, 2, 1, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 25_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 3, 3, 3, 3, 2, 1]),
      createSpawnPool(1, 2_500, [1, 2, 2, 3, 3, 3, 2, 1]),
      createSpawnPool(2, 2_500, [1, 2, 2, 3, 3, 3, 2, 1]),
    ],
  }),
  createWave({
    number: 9, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 1, 2, 4, 4, 3, 1]),
      createSpawnPool(1, 2_500, [0, 0, 1, 2, 4, 4, 2, 1]),
      createSpawnPool(2, 2_500, [0, 1, 1, 2, 4, 4, 3, 1]),
      createSpawnPool(3, 2_500, [0, 0, 1, 2, 4, 4, 2, 1]),
    ],
  }),
  createWave({
    number: 10, delayMs: 30_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 120,
    spawnPools: [
      createSpawnPool(1, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1),
      createSpawnPool(2, 5_000, [0, 0, 0, 0, 0, 0, 0, 0], 1),
    ],
  }),
]);
