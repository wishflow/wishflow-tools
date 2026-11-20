import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota06SpawnPointIdByActionId } from './dakota-06-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
  docCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota06SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Ice Rocks has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Ice Rocks APK addToWave data must contain eight regular request types');
  return Object.freeze({
    spawnPointId,
    intervalMs,
    requests: Object.freeze([...requestCounts, bossCount, docCount]),
  });
}

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze(pool))),
  });
}

/** Nine source-ordered APK waves; the Boss uses request slot 8 and Doc remains empty. */
export const dakota06CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(1, 2_000, [2, 3, 3, 5, 3, 3, 1, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(1, 2_000, [1, 2, 4, 5, 4, 3, 2, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 130,
    spawnPools: [createSpawnPool(0, 2_000, [1, 2, 4, 5, 4, 3, 2, 0])],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 5, 5, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 5, 5, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 25_000, hitPointMultiplierPercent: 195, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 5, 3, 0]),
      createSpawnPool(2, 3_000, [2, 3, 4, 5, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 5, 5, 3, 5, 2, 1]),
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 5, 3, 1]),
      createSpawnPool(2, 2_500, [2, 3, 4, 5, 4, 3, 1, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 220, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 5_000, [0, 0, 0, 0, 0, 0, 0, 2]),
      createSpawnPool(1, 5_000, [0, 0, 0, 0, 0, 0, 0, 2]),
      createSpawnPool(2, 6_000, [0, 0, 0, 0, 0, 0, 0, 2]),
    ],
  }),
  createWave({
    number: 9, delayMs: 25_000, hitPointMultiplierPercent: 205, speedMultiplierPercent: 160,
    spawnPools: [createSpawnPool(0, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);

export const dakota06CampaignSpawnRequestCount = dakota06CampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
