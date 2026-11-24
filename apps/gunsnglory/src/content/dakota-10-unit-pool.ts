import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition, SpawnLocationType } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './dakota-10.json';

const spawnLocationByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  113: { id: 'fort', spawnLocationType: 2 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => (
  row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
    const source = spawnLocationByCode[code as keyof typeof spawnLocationByCode];
    return source ? [{ ...source, id: `${source.id}-${x}-${y}`, cell: { x, y } }] : [];
  })
));

const expectedSpawnLocations = [
  { marker: 113, id: 'fort-30-1', spawnLocationType: 2, x: 30, y: 1 },
  { marker: 112, id: 'saloon-23-10', spawnLocationType: 1, x: 23, y: 10 },
  { marker: 114, id: 'tipi-1-19', spawnLocationType: 3, x: 1, y: 19 },
] as const;

if (spawnLocations.length !== expectedSpawnLocations.length
  || expectedSpawnLocations.some((expected) => !spawnLocations.some(({ id, spawnLocationType, cell }) => (
    id === expected.id && spawnLocationType === expected.spawnLocationType
      && cell.x === expected.x && cell.y === expected.y
  )))) {
  throw new Error('Sioux Falls player pool must match its three APK recruitment locations');
}

if (expectedSpawnLocations.some(({ marker, x, y }) => map.originalTileGrid[y]?.[x] !== marker)) {
  throw new Error('Sioux Falls player pool locations must remain attached to original TDM markers');
}

const poolTemplateCell = { x: 0, y: 0 };
const poolTypeToSpawnLocationType = Object.freeze({
  1: 1,
  2: 1,
  3: 2,
  4: 3,
} as const satisfies Record<number, SpawnLocationType>);
const waveOneValues = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 0 })));
const waveOneMaximums = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 4 })));

/** Sioux Falls has four APK pool slots, all attached to an actual recruitment location. */
export const dakota10CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // SpawnPoolManager's APK constructor sets this shared interval to 15,000 ms.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1, unitType: 'gunslinger', spawnLocationType: poolTypeToSpawnLocationType[1],
      template: createActiveGunslinger(poolTemplateCell, 1010),
    }),
    Object.freeze({
      poolType: 2, unitType: 'mexican', spawnLocationType: poolTypeToSpawnLocationType[2],
      template: createActiveMexicanUnit(poolTemplateCell, 1010),
    }),
    Object.freeze({
      poolType: 3, unitType: 'cannon', spawnLocationType: poolTypeToSpawnLocationType[3],
      template: createActiveFortKaboomUnit('cannon', poolTemplateCell, 1010),
    }),
    Object.freeze({
      poolType: 4, unitType: 'indian', spawnLocationType: poolTypeToSpawnLocationType[4],
      template: createActiveFortKaboomUnit('indian', poolTemplateCell, 1010),
    }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ action: 'set' as const, waveNumber: 1, values: waveOneValues }),
    Object.freeze({ action: 'set-max' as const, waveNumber: 1, values: waveOneMaximums }),
  ]),
});
