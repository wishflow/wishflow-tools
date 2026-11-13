import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon02SpawnPointIdByActionId } from './oregon-02-routes';

// M11/M12 map tests resolve this APK constant to the same 3-second interval.
const maxNumPointsIntervalMs = 3_000;

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon02SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Cashcow Canyon has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Cashcow Canyon APK addToWave data must contain eight request types');
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

/** Nine source-ordered APK waves; action IDs map to row-major spawn indices. */
export const oregon02CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 90, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(5, 2_500, [1, 1, 3, 2, 1, 2, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(4, 2_500, [0, 0, 2, 1, 2, 1, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 20_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(3, 3_500, [0, 0, 2, 3, 1, 1, 0, 0]),
      createSpawnPool(4, 3_500, [0, 0, 2, 1, 2, 1, 0, 0]),
      createSpawnPool(5, 3_500, [0, 0, 3, 3, 2, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 20_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(2, 3_500, [0, 0, 2, 3, 1, 1, 0, 0]),
      createSpawnPool(3, 4_000, [0, 0, 1, 2, 0, 1, 0, 0]),
      createSpawnPool(4, 3_500, [0, 0, 2, 1, 2, 1, 0, 0]),
      createSpawnPool(5, 3_500, [0, 0, 3, 3, 2, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 20_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(1, maxNumPointsIntervalMs, [0, 0, 2, 3, 1, 1, 0, 0]),
      createSpawnPool(2, 3_250, [0, 0, 2, 3, 1, 1, 0, 0]),
      createSpawnPool(3, 3_500, [0, 0, 1, 2, 0, 1, 0, 0]),
      createSpawnPool(4, 3_250, [0, 0, 2, 1, 2, 1, 0, 0]),
      createSpawnPool(5, maxNumPointsIntervalMs, [0, 0, 3, 3, 2, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 20_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, maxNumPointsIntervalMs, [0, 1, 2, 3, 1, 1, 1, 0]),
      createSpawnPool(1, maxNumPointsIntervalMs, [0, 0, 2, 3, 1, 1, 0, 0]),
      createSpawnPool(2, 3_250, [0, 0, 2, 3, 1, 1, 1, 0]),
      createSpawnPool(3, 3_500, [0, 0, 1, 2, 0, 1, 0, 0]),
      createSpawnPool(4, 3_250, [0, 0, 2, 1, 2, 1, 0, 0]),
      createSpawnPool(5, maxNumPointsIntervalMs, [0, 0, 3, 3, 2, 1, 1, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, maxNumPointsIntervalMs, [0, 1, 2, 3, 2, 1, 1, 0]),
      createSpawnPool(1, maxNumPointsIntervalMs, [0, 0, 3, 3, 1, 1, 0, 0]),
      createSpawnPool(2, 3_250, [0, 0, 2, 3, 2, 1, 1, 0]),
      createSpawnPool(3, 3_500, [0, 0, 2, 3, 0, 1, 1, 1]),
      createSpawnPool(4, 3_250, [0, 0, 3, 2, 2, 1, 0, 0]),
      createSpawnPool(5, maxNumPointsIntervalMs, [0, 0, 3, 4, 2, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, maxNumPointsIntervalMs, [0, 1, 3, 3, 2, 1, 1, 1]),
      createSpawnPool(1, maxNumPointsIntervalMs, [0, 0, 2, 3, 1, 1, 0, 1]),
      createSpawnPool(2, 3_250, [0, 0, 2, 3, 2, 1, 1, 0]),
      createSpawnPool(3, 3_500, [0, 0, 2, 3, 0, 1, 0, 0]),
      createSpawnPool(4, 3_250, [0, 0, 3, 2, 2, 1, 1, 1]),
      createSpawnPool(5, maxNumPointsIntervalMs, [0, 0, 3, 3, 2, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 9, delayMs: 25_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 145,
    spawnPools: [createSpawnPool(4, 2_500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);
