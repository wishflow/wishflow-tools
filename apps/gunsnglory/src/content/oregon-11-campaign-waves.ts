import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon11SpawnPointIdByActionId } from './oregon-11-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon11SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Loot Lakes has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Loot Lakes APK addToWave data must contain eight regular request types');
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

/** Nine Loot Lakes waves transcribed in APK call order; Boss uses request index 8. */
export const oregon11CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(1, 2_000, [3, 3, 4, 5, 3, 3, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 130,
    spawnPools: [createSpawnPool(1, 2_000, [1, 1, 4, 5, 4, 4, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 1, 4, 5, 4, 4, 2, 0]),
      createSpawnPool(1, 2_500, [1, 1, 4, 5, 4, 4, 2, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 3, 9, 1, 0, 0]),
      createSpawnPool(1, 2_000, [0, 0, 0, 3, 9, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 3, 3, 4, 4, 2, 0]),
      createSpawnPool(1, 2_500, [0, 0, 3, 4, 4, 4, 2, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 145,
    spawnPools: [createSpawnPool(2, 2_500, [0, 0, 2, 3, 4, 4, 3, 2])],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 2, 3, 4, 4, 3, 1]),
      createSpawnPool(1, 2_500, [1, 0, 2, 3, 4, 4, 3, 2]),
      createSpawnPool(2, 2_500, [0, 1, 2, 3, 4, 4, 3, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 215, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 2, 3, 4, 4, 3, 1]),
      createSpawnPool(1, 2_500, [1, 0, 2, 3, 4, 4, 3, 2]),
      createSpawnPool(2, 2_500, [0, 1, 2, 3, 4, 4, 3, 1]),
    ],
  }),
  createWave({
    number: 9, delayMs: 15_000, hitPointMultiplierPercent: 230, speedMultiplierPercent: 160,
    spawnPools: [createSpawnPool(1, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);
