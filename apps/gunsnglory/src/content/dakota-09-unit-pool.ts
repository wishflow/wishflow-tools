import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition, SpawnLocationType } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './dakota-09.json';

const spawnLocationsByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  113: { id: 'fort', spawnLocationType: 2 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
  const source = spawnLocationsByCode[code as keyof typeof spawnLocationsByCode];
  return source ? [{ ...source, id: `${source.id}-${x}-${y}`, cell: { x, y } }] : [];
}));

const expectedSpawnLocations = [
  { marker: 112, id: 'saloon-19-10', spawnLocationType: 1, x: 19, y: 10 },
  { marker: 112, id: 'saloon-15-15', spawnLocationType: 1, x: 15, y: 15 },
  { marker: 113, id: 'fort-30-6', spawnLocationType: 2, x: 30, y: 6 },
  { marker: 114, id: 'tipi-26-19', spawnLocationType: 3, x: 26, y: 19 },
] as const;

if (spawnLocations.length !== expectedSpawnLocations.length
  || expectedSpawnLocations.some((expected) => !spawnLocations.some(({ id, spawnLocationType, cell }) => (
    id === expected.id && spawnLocationType === expected.spawnLocationType
      && cell.x === expected.x && cell.y === expected.y
  )))) {
  throw new Error('Snow Town player pool must use the APK Saloon, Fort and Tipi locations');
}

if (expectedSpawnLocations.some(({ marker, x, y }) => map.originalTileGrid[y]?.[x] !== marker)) {
  throw new Error('Snow Town player pool locations must remain attached to their APK TDM markers');
}

const poolTemplateCell = { x: 0, y: 0 };
const poolTypeToSpawnLocationType = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3 } as const);
const waveOneValues = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 0 })));
const waveOneMaximums = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 4 })));

/** Snow Town's four original pools; templates are spawn designs, not starting map units. */
export const dakota09CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // SpawnPoolManager's shared 15-second default is not a Snow Town-specific wave parameter.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1, unitType: 'gunslinger', spawnLocationType: poolTypeToSpawnLocationType[1] as SpawnLocationType,
      template: createActiveGunslinger(poolTemplateCell, 909),
    }),
    Object.freeze({
      poolType: 2, unitType: 'mexican', spawnLocationType: poolTypeToSpawnLocationType[2] as SpawnLocationType,
      template: createActiveMexicanUnit(poolTemplateCell, 909),
    }),
    Object.freeze({
      poolType: 3, unitType: 'cannon', spawnLocationType: poolTypeToSpawnLocationType[3] as SpawnLocationType,
      template: createActiveFortKaboomUnit('cannon', poolTemplateCell, 909),
    }),
    Object.freeze({
      poolType: 4, unitType: 'indian', spawnLocationType: poolTypeToSpawnLocationType[4] as SpawnLocationType,
      template: createActiveFortKaboomUnit('indian', poolTemplateCell, 909),
    }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    // APK global level 39 (TDM file 42): Wave 1 action 1 clears all four pool slots.
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: waveOneValues }),
    // APK global level 39 (TDM file 42): Wave 1 action 3 caps each pool slot at four.
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: waveOneMaximums }),
  ]),
});
