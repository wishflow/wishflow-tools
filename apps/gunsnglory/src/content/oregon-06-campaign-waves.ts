import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon06SpawnPointIdByActionId } from './oregon-06-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon06SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Columbia River has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Columbia River APK addToWave data must contain eight request types');
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

/** Eight source-ordered APK waves; action IDs map to the TDM-derived spawn IDs. */
export const oregon06CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(1, 2_000, [2, 2, 2, 3, 1, 1, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(1, 2_000, [1, 1, 1, 2, 1, 2, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 20_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(1, 2_500, [0, 0, 1, 1, 1, 2, 1, 0]),
      createSpawnPool(2, 2_500, [1, 2, 1, 1, 2, 1, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 25_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(1, 2_500, [1, 1, 2, 2, 2, 3, 2, 0]),
      createSpawnPool(2, 2_500, [2, 3, 2, 2, 3, 2, 2, 1]),
      createSpawnPool(3, 2_500, [2, 3, 2, 2, 3, 2, 2, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 25_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(1, 2_500, [1, 1, 2, 2, 3, 3, 1, 2]),
      createSpawnPool(2, 2_500, [2, 2, 2, 2, 3, 2, 1, 2]),
      createSpawnPool(3, 2_500, [2, 2, 2, 3, 3, 2, 1, 2]),
    ],
  }),
  createWave({
    number: 6, delayMs: 25_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 1, 2, 2, 2, 3, 2, 1]),
      createSpawnPool(1, 2_500, [1, 1, 2, 2, 2, 3, 2, 0]),
      createSpawnPool(2, 2_500, [2, 3, 2, 2, 3, 2, 2, 1]),
      createSpawnPool(3, 2_500, [2, 3, 2, 2, 2, 2, 2, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 2, 3, 3, 3, 2, 1]),
      createSpawnPool(1, 2_500, [0, 1, 2, 3, 3, 3, 2, 1]),
      createSpawnPool(2, 2_500, [0, 1, 2, 3, 3, 3, 2, 1]),
      createSpawnPool(3, 2_500, [0, 1, 2, 3, 3, 3, 2, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 160,
    spawnPools: [createSpawnPool(0, 3_000, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);
