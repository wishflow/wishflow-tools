import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota03SpawnPointIdByActionId } from './dakota-03-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota03SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Fort Knockout has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Fort Knockout APK addToWave data must contain eight regular request types');
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

/** Ten source-ordered APK waves; Boss is request index 8 and Doc remains empty. */
export const dakota03CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(0, 2_000, [2, 3, 4, 5, 3, 2, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(0, 2_000, [2, 3, 4, 5, 3, 2, 2, 0])],
  }),
  createWave({
    number: 3, delayMs: 25_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(0, 2_500, [2, 2, 4, 5, 3, 2, 1, 0]),
      createSpawnPool(1, 2_500, [2, 3, 4, 5, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 2, 1, 0]),
      createSpawnPool(2, 2_500, [2, 3, 4, 5, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 4, 5, 4, 3, 1, 1]),
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 4, 2, 0]),
      createSpawnPool(2, 2_500, [2, 3, 4, 5, 2, 4, 2, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 4, 5, 4, 4, 2, 1]),
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 4, 3, 1]),
      createSpawnPool(2, 2_500, [2, 3, 4, 5, 3, 4, 2, 1]),
    ],
  }),
  createWave({
    number: 7, delayMs: 25_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 150,
    spawnPools: [createSpawnPool(3, 2_500, [1, 1, 3, 5, 3, 4, 3, 2])],
  }),
  createWave({
    number: 8, delayMs: 25_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 3, 5, 4, 4, 3, 3]),
      createSpawnPool(3, 2_500, [0, 0, 3, 5, 4, 4, 3, 3]),
    ],
  }),
  createWave({
    number: 9, delayMs: 25_000, hitPointMultiplierPercent: 195, speedMultiplierPercent: 160,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 3, 5, 4, 4, 3, 2]),
      createSpawnPool(1, 2_500, [1, 2, 4, 5, 3, 4, 3, 1]),
      createSpawnPool(2, 2_500, [2, 1, 4, 5, 3, 4, 2, 1]),
      createSpawnPool(3, 2_500, [0, 0, 3, 5, 4, 4, 3, 2]),
    ],
  }),
  createWave({
    number: 10, delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 165,
    spawnPools: [createSpawnPool(2, 500, [5, 4, 3, 3, 0, 0, 0, 0], 1)],
  }),
]);
