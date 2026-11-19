import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition, SpawnLocationType } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './dakota-05.json';

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
  { id: 'saloon', spawnLocationType: 1, x: 24, y: 15 },
  { id: 'fort', spawnLocationType: 2, x: 7, y: 15 },
  { id: 'tipi', spawnLocationType: 3, x: 29, y: 21 },
] as const;

if (spawnLocations.length !== expectedSpawnLocations.length
  || expectedSpawnLocations.some((expected) => !spawnLocations.some(({ id, spawnLocationType, cell }) => (
    id === expected.id && spawnLocationType === expected.spawnLocationType
      && cell.x === expected.x && cell.y === expected.y
  )))) {
  throw new Error('Ghost Town must use the APK Saloon, Fort and Tipi pool locations');
}

const poolTemplateCell = { x: 0, y: 0 };
const poolTypeToSpawnLocationType = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3 } as const);
const waveOneValues = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 0 })));
const waveOneMaximums = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 7 })));

/** Ghost Town's four hired-unit pools; templates are spawn designs, not starting map objects. */
export const dakota05CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // The APK's Ghost Town-specific global dispatch interval is unknown; retain the shared web default.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1,
      unitType: 'gunslinger',
      spawnLocationType: poolTypeToSpawnLocationType[1] as SpawnLocationType,
      template: createActiveGunslinger(poolTemplateCell, 905),
    }),
    Object.freeze({
      poolType: 2,
      unitType: 'mexican',
      spawnLocationType: poolTypeToSpawnLocationType[2] as SpawnLocationType,
      template: createActiveMexicanUnit(poolTemplateCell, 905),
    }),
    Object.freeze({
      poolType: 3,
      unitType: 'cannon',
      spawnLocationType: poolTypeToSpawnLocationType[3] as SpawnLocationType,
      template: createActiveFortKaboomUnit('cannon', poolTemplateCell, 905),
    }),
    Object.freeze({
      poolType: 4,
      unitType: 'indian',
      spawnLocationType: poolTypeToSpawnLocationType[4] as SpawnLocationType,
      template: createActiveFortKaboomUnit('indian', poolTemplateCell, 905),
    }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    // APK action 1 clears each configured inventory slot at the start of Wave 1.
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: waveOneValues }),
    // APK action 3 applies a seven-unit lifetime cap to each of the four configured pools.
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: waveOneMaximums }),
  ]),
});
