import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition, SpawnLocationType } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './dakota-06.json';

const spawnLocationsByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  113: { id: 'fort', spawnLocationType: 2 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
  const source = spawnLocationsByCode[code as keyof typeof spawnLocationsByCode];
  return source ? [{ ...source, cell: { x, y } }] : [];
}));

const expectedSpawnLocations = [
  { id: 'saloon', spawnLocationType: 1, x: 3, y: 3 },
  { id: 'fort', spawnLocationType: 2, x: 29, y: 8 },
  { id: 'tipi', spawnLocationType: 3, x: 21, y: 20 },
] as const;

if (spawnLocations.length !== expectedSpawnLocations.length
  || expectedSpawnLocations.some((expected) => !spawnLocations.some(({ id, spawnLocationType, cell }) => (
    id === expected.id && spawnLocationType === expected.spawnLocationType
      && cell.x === expected.x && cell.y === expected.y
  )))) {
  throw new Error('Ice Rocks must use the APK Saloon, Fort and Tipi pool locations');
}

const poolTemplateCell = { x: 0, y: 0 };
const poolTypeToSpawnLocationType = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3 } as const);
const waveOneValues = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 0 })));
const waveOneMaximums = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 3 })));

/** Ice Rocks' four player-unit pools; pool templates are not starting map objects. */
export const dakota06CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // No Ice Rocks-specific dispatch interval was established; retain the shared web cadence.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1,
      unitType: 'gunslinger',
      spawnLocationType: poolTypeToSpawnLocationType[1] as SpawnLocationType,
      template: createActiveGunslinger(poolTemplateCell, 606),
    }),
    Object.freeze({
      poolType: 2,
      unitType: 'mexican',
      spawnLocationType: poolTypeToSpawnLocationType[2] as SpawnLocationType,
      template: createActiveMexicanUnit(poolTemplateCell, 606),
    }),
    Object.freeze({
      poolType: 3,
      unitType: 'cannon',
      spawnLocationType: poolTypeToSpawnLocationType[3] as SpawnLocationType,
      template: createActiveFortKaboomUnit('cannon', poolTemplateCell, 606),
    }),
    Object.freeze({
      poolType: 4,
      unitType: 'indian',
      spawnLocationType: poolTypeToSpawnLocationType[4] as SpawnLocationType,
      template: createActiveFortKaboomUnit('indian', poolTemplateCell, 606),
    }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    // APK Wave 1 action 1 empties the four configured pool inventories.
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: waveOneValues }),
    // APK Wave 1 action 3 applies a three-unit lifetime cap to pool types 1–4.
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: waveOneMaximums }),
  ]),
});
