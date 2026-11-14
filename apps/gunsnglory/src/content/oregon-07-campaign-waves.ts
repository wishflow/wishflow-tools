import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon07SpawnPointIdByActionId } from './oregon-07-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon07SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Mount Hood has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Mount Hood APK addToWave data must contain eight request types');
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

/** Ten source-ordered APK waves; route IDs and boss slot retain the original TDM/API mapping. */
export const oregon07CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(3, 2_000, [2, 2, 2, 3, 2, 2, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(3, 2_000, [1, 1, 2, 3, 4, 3, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(3, 2_500, [0, 0, 2, 3, 4, 3, 1, 0]),
      createSpawnPool(2, 2_500, [1, 1, 2, 3, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(3, 2_500, [0, 0, 2, 3, 4, 3, 1, 0]),
      createSpawnPool(2, 2_500, [1, 1, 2, 3, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(3, 2_500, [0, 0, 2, 3, 4, 2, 1, 0]),
      createSpawnPool(2, 2_500, [1, 0, 2, 3, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [1, 1, 1, 3, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(3, 2_500, [2, 1, 6, 8, 1, 1, 0, 0]),
      createSpawnPool(2, 2_500, [1, 2, 6, 7, 1, 0, 0, 1]),
      createSpawnPool(1, 2_500, [1, 4, 5, 7, 1, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 150,
    spawnPools: [createSpawnPool(0, 2_500, [1, 1, 2, 3, 3, 3, 2, 0])],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(1, 2_500, [1, 0, 2, 3, 3, 4, 1, 0]),
      createSpawnPool(2, 2_500, [1, 0, 1, 3, 3, 3, 2, 1]),
      createSpawnPool(0, 2_500, [0, 1, 2, 3, 3, 3, 2, 0]),
    ],
  }),
  createWave({
    number: 9, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 160,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 1, 2, 3, 3, 3, 2, 1]),
      createSpawnPool(1, 2_500, [1, 0, 2, 3, 3, 4, 1, 0]),
      createSpawnPool(2, 2_500, [1, 0, 1, 3, 3, 3, 2, 1]),
      createSpawnPool(3, 2_500, [0, 1, 2, 3, 3, 3, 2, 0]),
    ],
  }),
  createWave({
    number: 10, delayMs: 25_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 165,
    spawnPools: [createSpawnPool(2, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);
