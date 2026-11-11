import type { CampaignUnitPoolDefinition, SpawnLocationType } from '../game';
import map from './new-mexico-10.json';

const spawnLocationsByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  113: { id: 'fort', spawnLocationType: 2 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

const spawnLocations = Object.freeze(map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
  const source = spawnLocationsByCode[code as keyof typeof spawnLocationsByCode];
  return source ? [Object.freeze({ ...source, cell: Object.freeze({ x, y }) })] : [];
})));

const poolTypeToSpawnLocationType = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3 } as const);

if (spawnLocations.length !== 3) {
  throw new Error('Lost City must have exactly one Saloon, Fort and Tipi spawn location');
}

/** Original Lost City player pools and wave-one stock reset/caps. */
export const lostCityUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 1, unitType: 'gunslinger', spawnLocationType: poolTypeToSpawnLocationType[1] as SpawnLocationType }),
    Object.freeze({ poolType: 2, unitType: 'mexican', spawnLocationType: poolTypeToSpawnLocationType[2] as SpawnLocationType }),
    Object.freeze({ poolType: 3, unitType: 'cannon', spawnLocationType: poolTypeToSpawnLocationType[3] as SpawnLocationType }),
    Object.freeze({ poolType: 4, unitType: 'indian', spawnLocationType: poolTypeToSpawnLocationType[4] as SpawnLocationType }),
  ]),
  spawnLocations,
  actions: Object.freeze([
    Object.freeze({
      waveNumber: 1,
      action: 'set' as const,
      values: Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 0 }))),
    }),
    Object.freeze({
      waveNumber: 1,
      action: 'set-max' as const,
      values: Object.freeze([7, 6, 4, 5].map((count, index) => Object.freeze({ poolType: index + 1, count }))),
    }),
  ]),
});
