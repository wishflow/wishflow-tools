import type { CampaignSpawnPoolDefinition, CampaignWaveDefinition } from '../game';
import { bombingtonSpawnPointIdByActionId } from './bombington-routes';

function createSpawnPool(
  actionId: number,
  intervalMs: number,
  requests: readonly number[],
): CampaignSpawnPoolDefinition {
  const spawnPointId = bombingtonSpawnPointIdByActionId[actionId];
  if (spawnPointId === undefined) throw new Error(`Bombington has no route for APK action ID ${actionId}`);
  if (requests.length !== 10) throw new Error('Bombington APK addToWave data must contain ten request slots');
  return Object.freeze({
    spawnPointId,
    intervalMs,
    requests: Object.freeze([...requests]),
  });
}

function createWave(wave: CampaignWaveDefinition): CampaignWaveDefinition {
  return Object.freeze({
    ...wave,
    spawnPools: Object.freeze(wave.spawnPools.map((pool) => Object.freeze(pool))),
  });
}

/** The ten source-ordered APK waves; request vectors retain all ten original slots. */
export const bombingtonCampaignWaves: readonly CampaignWaveDefinition[] = Object.freeze([
  createWave({
    number: 1,
    delayMs: 25_000,
    hitPointMultiplierPercent: 115,
    speedMultiplierPercent: 115,
    spawnPools: [
      createSpawnPool(2, 2_500, [2, 3, 4, 5, 3, 2, 0, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 2,
    delayMs: 15_000,
    hitPointMultiplierPercent: 120,
    speedMultiplierPercent: 115,
    spawnPools: [
      createSpawnPool(1, 2_500, [0, 3, 4, 5, 2, 3, 0, 0, 0, 0]),
      createSpawnPool(2, 2_500, [1, 3, 4, 5, 3, 1, 1, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 3,
    delayMs: 15_000,
    hitPointMultiplierPercent: 125,
    speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 3, 4, 5, 3, 1, 1, 0, 0, 0]),
      createSpawnPool(1, 2_500, [0, 3, 5, 5, 2, 3, 0, 0, 0, 0]),
      createSpawnPool(2, 2_500, [0, 3, 4, 4, 4, 3, 0, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 4,
    delayMs: 15_000,
    hitPointMultiplierPercent: 135,
    speedMultiplierPercent: 130,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 2, 5, 5, 3, 1, 1, 1, 0, 0]),
      createSpawnPool(1, 2_500, [0, 2, 4, 5, 2, 2, 0, 0, 0, 0]),
      createSpawnPool(2, 2_500, [0, 2, 3, 3, 3, 2, 0, 0, 0, 0]),
      createSpawnPool(3, 2_500, [0, 1, 2, 3, 3, 0, 0, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 5,
    delayMs: 15_000,
    hitPointMultiplierPercent: 150,
    speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_300, [1, 3, 4, 5, 3, 1, 1, 0, 0, 0]),
      createSpawnPool(1, 2_300, [0, 3, 5, 5, 2, 3, 0, 1, 0, 0]),
      createSpawnPool(2, 2_300, [0, 3, 4, 5, 3, 3, 1, 1, 0, 0]),
      createSpawnPool(3, 2_300, [0, 1, 2, 3, 3, 0, 0, 1, 0, 0]),
    ],
  }),
  createWave({
    number: 6,
    delayMs: 15_000,
    hitPointMultiplierPercent: 170,
    speedMultiplierPercent: 145,
    spawnPools: [
      createSpawnPool(0, 2_300, [1, 3, 4, 5, 3, 1, 1, 0, 0, 0]),
      createSpawnPool(1, 2_300, [0, 3, 5, 5, 2, 3, 1, 1, 0, 0]),
      createSpawnPool(2, 2_300, [0, 3, 4, 5, 3, 3, 2, 1, 0, 0]),
      createSpawnPool(3, 2_300, [0, 1, 2, 3, 3, 1, 1, 1, 0, 0]),
      createSpawnPool(4, 2_300, [0, 1, 2, 3, 3, 1, 0, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 7,
    delayMs: 15_000,
    hitPointMultiplierPercent: 190,
    speedMultiplierPercent: 140,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 2, 3, 5, 3, 1, 2, 1, 0, 0]),
      createSpawnPool(1, 2_500, [0, 2, 4, 5, 2, 3, 2, 1, 0, 0]),
      createSpawnPool(2, 2_500, [0, 2, 3, 4, 3, 3, 2, 1, 0, 0]),
      createSpawnPool(3, 2_500, [0, 0, 1, 2, 3, 2, 1, 1, 0, 0]),
      createSpawnPool(4, 2_500, [0, 0, 1, 2, 3, 2, 2, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 8,
    delayMs: 15_000,
    hitPointMultiplierPercent: 210,
    speedMultiplierPercent: 150,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 0, 3, 6, 1, 2, 2, 0, 0]),
      createSpawnPool(1, 2_500, [0, 0, 0, 3, 6, 2, 3, 1, 0, 0]),
      createSpawnPool(2, 2_500, [0, 0, 0, 3, 6, 2, 2, 2, 0, 0]),
      createSpawnPool(3, 2_500, [0, 0, 0, 2, 3, 2, 2, 1, 0, 0]),
      createSpawnPool(4, 2_500, [0, 0, 0, 2, 3, 2, 2, 2, 0, 0]),
    ],
  }),
  createWave({
    number: 9,
    delayMs: 15_000,
    hitPointMultiplierPercent: 245,
    speedMultiplierPercent: 155,
    spawnPools: [
      createSpawnPool(0, 2_300, [0, 0, 3, 4, 3, 1, 2, 1, 0, 0]),
      createSpawnPool(1, 2_300, [0, 0, 3, 4, 2, 2, 2, 1, 0, 0]),
      createSpawnPool(2, 2_300, [0, 0, 2, 4, 3, 2, 2, 1, 0, 0]),
      createSpawnPool(3, 2_300, [0, 0, 0, 2, 3, 2, 1, 1, 0, 0]),
      createSpawnPool(4, 2_300, [0, 0, 0, 2, 3, 2, 2, 0, 0, 0]),
    ],
  }),
  createWave({
    number: 10,
    delayMs: 15_000,
    hitPointMultiplierPercent: 240,
    speedMultiplierPercent: 125,
    spawnPools: [
      createSpawnPool(0, 2_500, [0, 0, 0, 2, 0, 0, 1, 2, 0, 0]),
      createSpawnPool(1, 2_500, [0, 0, 0, 0, 3, 0, 0, 0, 0, 0]),
      createSpawnPool(2, 2_500, [0, 0, 0, 0, 4, 0, 0, 0, 0, 0]),
      createSpawnPool(3, 2_500, [0, 0, 0, 3, 0, 0, 0, 0, 0, 0]),
      createSpawnPool(4, 2_500, [0, 0, 0, 1, 0, 0, 0, 0, 1, 0]),
    ],
  }),
]);

/** Count of source addToWave rows, each keyed to a distinct spawn action. */
export const bombingtonCampaignSpawnRequestCount = bombingtonCampaignWaves.reduce(
  (count, wave) => count + wave.spawnPools.length,
  0,
);
