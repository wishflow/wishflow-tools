import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota07SpawnPointIdByActionId } from './dakota-07-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
  docCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota07SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Frost Station has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Frost Station APK addToWave data must contain eight regular request types');
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

/** Eight source-ordered APK waves; the final request slot (Doc) remains empty. */
export const dakota07CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(0, 2_000, [2, 3, 3, 5, 2, 4, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(0, 2_000, [1, 3, 4, 5, 2, 3, 2, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 2, 4, 5, 4, 3, 1, 0]),
      createSpawnPool(1, 2_500, [0, 2, 4, 5, 4, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 2, 4, 7, 1, 0, 0, 0]),
      createSpawnPool(1, 2_000, [0, 2, 4, 7, 1, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 25_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 2, 3, 3, 2, 4, 3, 0]),
      createSpawnPool(1, 2_500, [0, 2, 3, 3, 2, 4, 3, 0]),
      createSpawnPool(2, 3_000, [0, 2, 3, 2, 1, 3, 2, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 25_000, hitPointMultiplierPercent: 205, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 1, 3, 3, 2, 4, 3, 1]),
      createSpawnPool(1, 2_500, [0, 1, 2, 3, 2, 4, 3, 1]),
      createSpawnPool(2, 2_500, [0, 2, 3, 2, 1, 3, 2, 0]),
      createSpawnPool(3, 3_000, [1, 1, 3, 2, 1, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 3, 3, 2, 4, 3, 1]),
      createSpawnPool(1, 2_500, [0, 0, 2, 3, 2, 4, 3, 1]),
      createSpawnPool(2, 2_500, [0, 2, 3, 2, 3, 5, 3, 1]),
      createSpawnPool(3, 3_000, [0, 1, 3, 2, 3, 6, 3, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 25_000, hitPointMultiplierPercent: 230, speedMultiplierPercent: 160,
    spawnPools: [createSpawnPool(1, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);

export const dakota07CampaignSpawnRequestCount = dakota07CampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
