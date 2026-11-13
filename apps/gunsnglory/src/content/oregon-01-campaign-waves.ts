import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { oregon01SpawnPointIdByActionId } from './oregon-01-routes';

function createSpawnPool(actionId: number, requestCounts: readonly number[]): CampaignSpawnPoolDefinition {
  const spawnPointId = oregon01SpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Eastwood Forest has no route for APK action ID ${actionId}`);
  if (requestCounts.length !== 8) throw new Error('Eastwood Forest APK addToWave data must contain eight request types');
  return Object.freeze({
    spawnPointId,
    intervalMs: 2_500,
    requests: Object.freeze([...requestCounts, 0, 0]),
  });
}

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze(pool))),
  });
}

/** Eight APK source-ordered waves; each action ID resolves through the original TDM spawn order. */
export const oregon01CampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1, delayMs: 15_000, hitPointMultiplierPercent: 90, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(0, [2, 3, 1, 2, 1, 2, 0, 0])],
  }),
  createWave({
    number: 2, delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    spawnPools: [createSpawnPool(1, [0, 3, 2, 3, 2, 3, 0, 0])],
  }),
  createWave({
    number: 3, delayMs: 15_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(0, [0, 0, 2, 3, 2, 1, 1, 0]),
      createSpawnPool(1, [0, 0, 2, 3, 2, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 4, delayMs: 20_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(2, [0, 0, 2, 3, 2, 2, 0, 0]),
      createSpawnPool(3, [0, 0, 2, 3, 2, 1, 1, 0]),
    ],
  }),
  createWave({
    number: 5, delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(2, [0, 0, 0, 5, 2, 1, 1, 0]),
      createSpawnPool(3, [0, 0, 0, 5, 1, 2, 1, 0]),
    ],
  }),
  createWave({
    number: 6, delayMs: 20_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 135,
    spawnPools: [
      createSpawnPool(0, [0, 0, 2, 3, 2, 1, 1, 0]),
      createSpawnPool(1, [0, 0, 2, 3, 1, 2, 0, 0]),
      createSpawnPool(2, [0, 0, 2, 3, 2, 1, 1, 0]),
      createSpawnPool(3, [0, 0, 2, 3, 1, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 7, delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, [0, 0, 2, 3, 1, 1, 1, 0]),
      createSpawnPool(1, [0, 0, 2, 3, 2, 2, 2, 0]),
      createSpawnPool(2, [0, 0, 2, 3, 1, 1, 1, 0]),
      createSpawnPool(3, [0, 0, 2, 3, 1, 2, 2, 0]),
    ],
  }),
  createWave({
    number: 8, delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, [0, 0, 2, 2, 1, 1, 1, 1]),
      createSpawnPool(1, [0, 0, 2, 2, 2, 2, 2, 0]),
      createSpawnPool(2, [0, 0, 2, 2, 1, 1, 1, 0]),
      createSpawnPool(3, [0, 0, 2, 2, 1, 2, 2, 0]),
    ],
  }),
]);
