import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { nevada01SpawnPointIdByActionId } from './nevada-01-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requestCounts: readonly number[],
  bossCount = 0,
  docCount = 0,
): CampaignSpawnPoolDefinition {
  const spawnPointId = nevada01SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Labyrinth Gulch has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Labyrinth Gulch APK addToWave data must contain eight ordinary request types');
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

/** Source-ordered waves for global campaign level 41, from GameDesignWaves.setWaves(i == 41). */
export const nevada01CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 100,
    spawnPools: [
      createSpawnPool(0, 3_000, [2, 3, 4, 3, 3, 2, 0, 0]),
      createSpawnPool(1, 3_000, [2, 3, 4, 3, 3, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 110,
    spawnPools: [
      createSpawnPool(0, 3_000, [1, 1, 4, 5, 3, 2, 0, 0]),
      createSpawnPool(1, 3_000, [1, 3, 4, 5, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 115,
    spawnPools: [
      createSpawnPool(0, 2_500, [1, 1, 1, 3, 4, 2, 1, 0]),
      createSpawnPool(1, 2_500, [1, 1, 1, 3, 4, 1, 2, 0]),
      createSpawnPool(2, 2_500, [1, 0, 1, 3, 5, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 120,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 1, 2, 3, 2, 2, 1, 0]),
      createSpawnPool(1, 2_000, [0, 1, 2, 3, 2, 3, 1, 1]),
      createSpawnPool(2, 2_000, [0, 0, 1, 3, 3, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 1, 2, 1, 2, 1, 0]),
      createSpawnPool(1, 2_500, [0, 0, 1, 2, 1, 4, 1, 0]),
      createSpawnPool(2, 2_500, [0, 0, 1, 2, 1, 2, 1, 0]),
      createSpawnPool(3, 2_500, [0, 0, 2, 2, 1, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 2, 3, 1, 2, 2, 0]),
      createSpawnPool(1, 2_500, [0, 0, 2, 3, 1, 3, 2, 0]),
      createSpawnPool(2, 2_500, [0, 0, 2, 3, 1, 3, 1, 0]),
      createSpawnPool(3, 2_500, [0, 0, 2, 3, 1, 3, 1, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_250, [0, 0, 1, 2, 2, 2, 1, 0]),
      createSpawnPool(1, 2_250, [0, 0, 1, 2, 2, 3, 2, 1]),
      createSpawnPool(2, 2_250, [0, 0, 1, 2, 2, 2, 2, 0]),
      createSpawnPool(3, 2_250, [0, 0, 2, 2, 2, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 230, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 1, 2, 1, 0, 2]),
      createSpawnPool(1, 2_000, [0, 0, 0, 1, 2, 0, 1, 1]),
      createSpawnPool(2, 2_000, [0, 0, 0, 1, 2, 1, 0, 1]),
      createSpawnPool(3, 2_000, [0, 0, 0, 1, 2, 0, 1, 1]),
    ],
  }),
  createWave({
    number: 9, delayMs: 15_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 1, 2, 2, 2, 1]),
      createSpawnPool(1, 2_000, [0, 0, 0, 1, 2, 2, 1, 1]),
      createSpawnPool(2, 2_000, [0, 0, 0, 1, 2, 2, 2, 1]),
      createSpawnPool(3, 2_000, [0, 0, 0, 1, 2, 2, 2, 0]),
    ],
  }),
  createWave({
    number: 10, delayMs: 15_000, hitPointMultiplierPercent: 260, speedMultiplierPercent: 160,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 1, 2, 2, 2, 0]),
      createSpawnPool(1, 2_000, [0, 0, 0, 1, 1, 2, 2, 1]),
      createSpawnPool(2, 2_000, [0, 0, 0, 1, 2, 2, 2, 1]),
      createSpawnPool(3, 2_000, [0, 0, 0, 1, 1, 2, 2, 1]),
    ],
  }),
  createWave({
    number: 11, delayMs: 15_000, hitPointMultiplierPercent: 270, speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_000, [0, 0, 0, 0, 0, 0, 0, 0], 1),
      createSpawnPool(2, 2_000, [0, 0, 0, 1, 0, 0, 0, 1]),
      createSpawnPool(3, 2_000, [0, 0, 0, 1, 0, 0, 0, 1]),
    ],
  }),
]);

/** Effective spawn-pool rows; all 37 APK calls use unique action IDs within their wave. */
export const nevada01CampaignSpawnRequestCount = nevada01CampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
