import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon09SpawnPointIdByActionId } from './oregon-09-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon09SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Snake River has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Snake River APK addToWave data must contain eight request types');
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

/** Six source-ordered APK waves; each pool preserves its action ID and separate Boss slot. */
export const oregon09CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 5_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(2, 2_500, [1, 1, 2, 3, 2, 2, 1, 0])],
  }),
  createWave({
    number: 2, delayMs: 5_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(0, 2_500, [2, 2, 2, 3, 2, 2, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(0, 2_500, [2, 2, 2, 3, 2, 2, 1, 0]),
      createSpawnPool(2, 2_500, [2, 2, 2, 3, 2, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_500, [2, 2, 2, 3, 2, 2, 1, 0]),
      createSpawnPool(1, 2_500, [2, 2, 2, 3, 2, 2, 1, 0]),
      createSpawnPool(2, 2_500, [2, 2, 2, 3, 2, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_500, [2, 2, 2, 3, 2, 2, 1, 1]),
      createSpawnPool(1, 2_500, [2, 2, 2, 3, 2, 2, 1, 1]),
      createSpawnPool(2, 2_500, [2, 2, 2, 3, 2, 2, 1, 1]),
    ],
  }),
  createWave({
    number: 6, delayMs: 25_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 140,
    spawnPools: [createSpawnPool(1, 2_500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);
