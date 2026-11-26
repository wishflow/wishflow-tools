import type {
  CampaignUnitPoolDefinition,
  CampaignUnitSpawnLocationDefinition,
  SpawnLocationType,
} from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './nevada-01.json';

const spawnLocationsByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  113: { id: 'fort', spawnLocationType: 2 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
  const source = spawnLocationsByCode[code as keyof typeof spawnLocationsByCode];
  return source ? [{ ...source, cell: { x, y } }] : [];
}));

const expectedSpawnLocations = [
  { id: 'saloon', spawnLocationType: 1, x: 2, y: 17 },
  { id: 'fort', spawnLocationType: 2, x: 2, y: 7 },
  { id: 'tipi', spawnLocationType: 3, x: 28, y: 21 },
] as const;

if (spawnLocations.length !== expectedSpawnLocations.length
  || expectedSpawnLocations.some((expected) => !spawnLocations.some(({ id, spawnLocationType, cell }) => (
    id === expected.id && spawnLocationType === expected.spawnLocationType
      && cell.x === expected.x && cell.y === expected.y
  )))) {
  throw new Error('Labyrinth Gulch must use its APK Saloon, Fort and Tipi spawn locations');
}

const spawnLocationForType = (spawnLocationType: SpawnLocationType) => {
  const location = spawnLocations.find((entry) => entry.spawnLocationType === spawnLocationType);
  if (!location) throw new Error(`Labyrinth Gulch is missing spawn location type ${spawnLocationType}`);
  return location;
};

const spawnCell = (spawnLocationType: SpawnLocationType) => spawnLocationForType(spawnLocationType).cell;
const poolTypeToSpawnLocationType = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3 } as const);
const emptyWaveOnePools = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({
  poolType,
  count: 0,
})));
const waveOnePoolMaximums = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({
  poolType,
  count: 4,
})));

/** The four level-41 pool templates; none is an initial map unit. */
export const nevada01CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1,
      unitType: 'gunslinger',
      spawnLocationType: poolTypeToSpawnLocationType[1] as SpawnLocationType,
      template: createActiveGunslinger(spawnCell(1), 4101),
    }),
    Object.freeze({
      poolType: 2,
      unitType: 'mexican',
      spawnLocationType: poolTypeToSpawnLocationType[2] as SpawnLocationType,
      template: createActiveMexicanUnit(spawnCell(1), 4102),
    }),
    Object.freeze({
      poolType: 3,
      unitType: 'cannon',
      spawnLocationType: poolTypeToSpawnLocationType[3] as SpawnLocationType,
      template: createActiveFortKaboomUnit('cannon', spawnCell(2), 4103),
    }),
    Object.freeze({
      poolType: 4,
      unitType: 'indian',
      spawnLocationType: poolTypeToSpawnLocationType[4] as SpawnLocationType,
      template: createActiveFortKaboomUnit('indian', spawnCell(3), 4104),
    }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    // APK Wave 1 action 1 clears every player-unit pool slot.
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: emptyWaveOnePools }),
    // APK Wave 1 action 3 sets a four-unit lifetime cap for each pool type 1–4.
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: waveOnePoolMaximums }),
  ]),
});
