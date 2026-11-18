import type { CampaignUnitPoolDefinition, SpawnLocationType } from '../game';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './dakota-02.json';

const spawnLocationsByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

const spawnLocations = Object.freeze(map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
  const source = spawnLocationsByCode[code as keyof typeof spawnLocationsByCode];
  return source ? [Object.freeze({ ...source, cell: Object.freeze({ x, y }) })] : [];
})));

if (spawnLocations.length !== 2
  || !spawnLocations.some(({ id, cell }) => id === 'saloon' && cell.x === 29 && cell.y === 3)
  || !spawnLocations.some(({ id, cell }) => id === 'tipi' && cell.x === 12 && cell.y === 10)) {
  throw new Error('Six Grandfathers must use the original Saloon and Tipi pool locations');
}

const spawnTypeByPoolType = Object.freeze({ 1: 1, 2: 1, 4: 3 } as const);
const waveOneValues = Object.freeze([
  Object.freeze({ poolType: 1, count: 0 }),
  Object.freeze({ poolType: 2, count: 0 }),
  Object.freeze({ poolType: 4, count: 0 }),
]);

/** Uses the original Saloon/Tipi pools; Cannon is absent because there is no Fort marker. */
export const dakota02CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // The APK's per-level global pool cadence is not confirmed; retain the shared web cadence.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1,
      unitType: 'gunslinger',
      spawnLocationType: spawnTypeByPoolType[1] as SpawnLocationType,
      template: createActiveGunslinger({ x: 0, y: 0 }, 90),
    }),
    Object.freeze({
      poolType: 2,
      unitType: 'mexican',
      spawnLocationType: spawnTypeByPoolType[2] as SpawnLocationType,
      template: createActiveMexicanUnit({ x: 0, y: 0 }, 90),
    }),
    Object.freeze({
      poolType: 4,
      unitType: 'indian',
      spawnLocationType: spawnTypeByPoolType[4] as SpawnLocationType,
    }),
  ]),
  spawnLocations,
  actions: Object.freeze([
    Object.freeze({ action: 'set' as const, waveNumber: 1, values: waveOneValues }),
    Object.freeze({
      action: 'set-max' as const,
      waveNumber: 1,
      values: Object.freeze([
        Object.freeze({ poolType: 1, count: 3 }),
        Object.freeze({ poolType: 2, count: 3 }),
        Object.freeze({ poolType: 4, count: 3 }),
      ]),
    }),
  ]),
});
