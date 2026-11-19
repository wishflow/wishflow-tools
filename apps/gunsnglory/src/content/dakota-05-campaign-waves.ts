import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota05SpawnPointIdByActionId } from './dakota-05-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
  docCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota05SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Ghost Town has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Ghost Town APK addToWave data must contain eight regular request types');
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

/** Nine source-ordered APK waves; the single Boss occupies request index 8 and Doc remains empty. */
export const dakota05CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(1, 2_000, [2, 3, 4, 5, 4, 3, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(1, 2_000, [1, 2, 4, 5, 3, 2, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 4, 5, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [0, 0, 4, 5, 3, 4, 2, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 4, 5, 3, 3, 1, 0]),
      createSpawnPool(1, 2_500, [1, 2, 4, 5, 2, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 25_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 140,
    spawnPools: [createSpawnPool(2, 2_500, [1, 2, 4, 5, 4, 2, 1, 0])],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 2, 4, 5, 5, 4, 2, 1]),
      createSpawnPool(1, 2_500, [0, 0, 4, 5, 3, 4, 2, 0]),
      createSpawnPool(2, 3_000, [1, 1, 3, 5, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 2, 4, 5, 3, 4, 2, 1]),
      createSpawnPool(1, 2_500, [0, 0, 4, 5, 2, 4, 2, 0]),
      createSpawnPool(2, 2_500, [1, 1, 3, 5, 3, 3, 2, 1]),
      createSpawnPool(3, 2_500, [0, 2, 3, 4, 3, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 4, 4, 3, 4, 2, 1]),
      createSpawnPool(1, 2_500, [1, 0, 4, 4, 2, 4, 2, 1]),
      createSpawnPool(2, 2_500, [1, 0, 3, 4, 4, 4, 2, 1]),
      createSpawnPool(3, 2_500, [0, 1, 3, 4, 3, 4, 2, 1]),
    ],
  }),
  createWave({
    number: 9, delayMs: 25_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 160,
    spawnPools: [createSpawnPool(0, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);

export const dakota05CampaignSpawnRequestCount = dakota05CampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
