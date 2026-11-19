import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota04SpawnPointIdByActionId } from './dakota-04-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
  docCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota04SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Badlands has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Badlands APK addToWave data must contain eight regular request types');
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

/** Nine source-ordered APK waves; Boss uses request index 8 and Doc remains empty. */
export const dakota04CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(0, 2_000, [2, 3, 4, 5, 3, 2, 1, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(0, 2_000, [2, 3, 4, 5, 3, 2, 2, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 130,
    spawnPools: [createSpawnPool(0, 2_000, [2, 2, 4, 5, 3, 2, 2, 1])],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 135,
    spawnPools: [createSpawnPool(1, 2_000, [2, 2, 4, 5, 3, 2, 2, 1])],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [2, 2, 4, 5, 3, 3, 2, 1]),
      createSpawnPool(1, 2_500, [2, 2, 4, 5, 3, 3, 2, 1]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 3, 4, 3, 3, 3, 2]),
      createSpawnPool(1, 2_500, [2, 1, 2, 3, 3, 3, 2, 3]),
    ],
  }),
  createWave({
    number: 7, delayMs: 25_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 150,
    spawnPools: [createSpawnPool(2, 2_500, [1, 2, 3, 4, 3, 4, 3, 2])],
  }),
  createWave({
    number: 8, delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 2, 3, 2, 4, 3, 2]),
      createSpawnPool(1, 2_500, [0, 0, 2, 3, 2, 4, 3, 2]),
      createSpawnPool(2, 2_500, [0, 0, 2, 3, 2, 4, 3, 2]),
    ],
  }),
  createWave({
    number: 9, delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 145,
    spawnPools: [createSpawnPool(0, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);

export const dakota04CampaignSpawnRequestCount = dakota04CampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
