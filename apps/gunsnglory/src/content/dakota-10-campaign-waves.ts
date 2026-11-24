import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota10SpawnPointIdByActionId } from './dakota-10-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
  docCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota10SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Sioux Falls has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Sioux Falls APK wave rows must contain eight ordinary request types');
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

/** Ten APK waves; 28 source calls become 28 distinct action-indexed request pools. */
export const dakota10CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(1, 2_000, [2, 3, 4, 5, 3, 2, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(1, 2_000, [1, 2, 3, 4, 5, 2, 2, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(1, 2_500, [1, 2, 3, 4, 3, 4, 2, 0]),
      createSpawnPool(2, 2_500, [1, 2, 3, 4, 3, 4, 2, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(1, 2_500, [1, 2, 3, 4, 3, 4, 2, 1]),
      createSpawnPool(2, 2_500, [1, 2, 3, 4, 3, 4, 2, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 2, 3, 4, 3, 4, 3, 0]),
      createSpawnPool(1, 2_500, [0, 2, 3, 4, 3, 5, 2, 1]),
      createSpawnPool(2, 2_500, [0, 2, 3, 4, 3, 4, 3, 1]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 2, 3, 2, 2, 3, 1]),
      createSpawnPool(1, 2_500, [0, 1, 2, 3, 1, 3, 3, 1]),
      createSpawnPool(2, 2_500, [0, 1, 2, 3, 2, 4, 3, 1]),
      createSpawnPool(3, 3_000, [0, 1, 2, 3, 1, 4, 2, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 2, 3, 2, 2, 3, 1]),
      createSpawnPool(1, 2_500, [0, 1, 2, 3, 1, 3, 3, 1]),
      createSpawnPool(2, 2_500, [0, 1, 2, 3, 2, 4, 3, 1]),
      createSpawnPool(3, 2_500, [0, 1, 2, 3, 1, 4, 3, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 1, 3, 2, 2, 3, 1]),
      createSpawnPool(1, 2_500, [0, 0, 1, 3, 1, 3, 3, 1]),
      createSpawnPool(2, 2_500, [0, 0, 1, 3, 2, 4, 3, 1]),
      createSpawnPool(3, 2_500, [0, 0, 2, 3, 1, 3, 2, 1]),
      createSpawnPool(4, 3_000, [0, 1, 2, 3, 3, 3, 1, 1]),
    ],
  }),
  createWave({
    number: 9, delayMs: 15_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 160,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 1, 3, 1, 2, 3, 1]),
      createSpawnPool(1, 2_500, [0, 0, 1, 3, 1, 4, 2, 1]),
      createSpawnPool(2, 2_500, [0, 0, 1, 3, 1, 2, 3, 1]),
      createSpawnPool(3, 2_500, [0, 0, 2, 3, 1, 2, 2, 1]),
      createSpawnPool(4, 2_500, [0, 1, 2, 3, 1, 2, 1, 1]),
    ],
  }),
  createWave({
    number: 10, delayMs: 25_000, hitPointMultiplierPercent: 240, speedMultiplierPercent: 165,
    spawnPools: [createSpawnPool(1, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);

export const dakota10CampaignSpawnRequestCount = dakota10CampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
