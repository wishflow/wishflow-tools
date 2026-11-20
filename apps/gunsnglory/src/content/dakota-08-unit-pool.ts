import type {
  CampaignUnitPoolDefinition,
  CampaignUnitSpawnLocationDefinition,
} from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './dakota-08.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
  if (code === 112) return [{ id: `saloon-${x}-${y}`, spawnLocationType: 1, cell: { x, y } }];
  if (code === 113) return [{ id: `fort-${x}-${y}`, spawnLocationType: 2, cell: { x, y } }];
  return [];
}));

const expectedLocations = [
  { code: 112, id: 'saloon-29-12', spawnLocationType: 1, x: 29, y: 12 },
  { code: 113, id: 'fort-2-12', spawnLocationType: 2, x: 2, y: 12 },
] as const;

if (spawnLocations.length !== expectedLocations.length
  || expectedLocations.some((expected) => !spawnLocations.some(({ id, spawnLocationType, cell }) => (
    id === expected.id && spawnLocationType === expected.spawnLocationType
      && cell.x === expected.x && cell.y === expected.y
  )))) {
  throw new Error('Wayne Waters player pool must use the APK Saloon and Fort only; it has no Tipi');
}

const poolTemplateCell = { x: 0, y: 0 };
const poolTypeToSpawnLocationType = Object.freeze({ 1: 1, 2: 1, 3: 2 } as const);
const waveOneValues = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 0 })));
const waveOneMaximums = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 3 })));

/** The APK sets four raw slots; slot 4 has no Indian template because this map has no Tipi. */
export const dakota08CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // The source's global player-spawn interval is not resolved here; retain the shared web default.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1, unitType: 'gunslinger', spawnLocationType: poolTypeToSpawnLocationType[1],
      template: createActiveGunslinger(poolTemplateCell, 808),
    }),
    Object.freeze({
      poolType: 2, unitType: 'mexican', spawnLocationType: poolTypeToSpawnLocationType[2],
      template: createActiveMexicanUnit(poolTemplateCell, 808),
    }),
    Object.freeze({
      poolType: 3, unitType: 'cannon', spawnLocationType: poolTypeToSpawnLocationType[3],
      template: createActiveFortKaboomUnit('cannon', poolTemplateCell, 808),
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
