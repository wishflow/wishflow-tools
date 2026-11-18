import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { dakota02SpawnPointIdByActionId } from './dakota-02-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = dakota02SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Six Grandfathers has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Six Grandfathers APK addToWave data must contain eight regular request types');
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

/** Eight source-ordered APK waves; Boss uses request index 8 and Doc index 9 stays empty. */
export const dakota02CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(1, 2_000, [3, 3, 4, 5, 3, 3, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 125,
    spawnPools: [createSpawnPool(1, 2_500, [2, 2, 3, 4, 3, 3, 1, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 130,
    spawnPools: [createSpawnPool(1, 2_500, [1, 2, 4, 4, 3, 3, 2, 1])],
  }),
  createWave({
    number: 4, delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    spawnPools: [createSpawnPool(0, 2_500, [1, 2, 4, 4, 3, 3, 2, 1])],
  }),
  createWave({
    number: 5, delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 2, 4, 4, 3, 3, 2, 1]),
      createSpawnPool(1, 2_500, [1, 2, 4, 4, 3, 3, 2, 1]),
    ],
  }),
  createWave({
    number: 6, delayMs: 25_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 6_000, [0, 0, 0, 0, 0, 1, 2, 4]),
      createSpawnPool(1, 2_500, [1, 2, 4, 4, 3, 3, 2, 1]),
      createSpawnPool(2, 3_500, [1, 2, 4, 4, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 6_000, [0, 0, 0, 0, 0, 0, 1, 4]),
      createSpawnPool(1, 2_500, [0, 1, 2, 4, 2, 4, 2, 1]),
      createSpawnPool(2, 2_500, [0, 1, 2, 4, 2, 4, 2, 1]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 160,
    spawnPools: [createSpawnPool(0, 500, [0, 0, 0, 0, 0, 0, 0, 0], 1)],
  }),
]);
