import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota08SpawnPointIdByActionId } from './dakota-08-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
  docCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota08SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Wayne Waters has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Wayne Waters APK addToWave data must contain eight regular request types');
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

/** Eight source-ordered APK waves; Boss and Doc occupy request indices 8 and 9. */
export const dakota08CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(2, 2_000, [2, 3, 4, 5, 5, 4, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(2, 2_000, [1, 3, 4, 5, 4, 3, 2, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(2, 2_500, [0, 2, 3, 4, 4, 3, 2, 0]),
      createSpawnPool(3, 2_500, [1, 3, 4, 4, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 20_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(1, 2_500, [1, 3, 4, 5, 4, 3, 2, 0]),
      createSpawnPool(2, 2_500, [1, 3, 4, 4, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 20_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 3, 4, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [1, 2, 3, 5, 4, 3, 2, 1]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 4, 4, 3, 4, 1, 0]),
      createSpawnPool(1, 2_500, [0, 2, 3, 4, 4, 3, 2, 1]),
      createSpawnPool(2, 2_500, [0, 2, 3, 4, 3, 4, 1, 1]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 3, 3, 4, 4, 2, 1]),
      createSpawnPool(1, 2_500, [0, 1, 3, 3, 4, 3, 2, 2]),
      createSpawnPool(2, 2_500, [0, 1, 3, 3, 4, 4, 2, 2]),
      createSpawnPool(3, 2_500, [0, 1, 3, 3, 4, 4, 2, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 25_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 155,
    spawnPools: [createSpawnPool(2, 50_000, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);

export const dakota08CampaignSpawnRequestCount = dakota08CampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
