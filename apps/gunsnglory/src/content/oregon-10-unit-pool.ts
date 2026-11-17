import type {
  CampaignUnitPoolDefinition,
  CampaignUnitSpawnLocationDefinition,
} from '../game';
import { createActiveGunslinger, createActiveMexicanUnit } from './new-mexico-unit-entities';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './oregon-10.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
  if (code === 112) return [{ id: `saloon-${x}-${y}`, spawnLocationType: 1, cell: { x, y } }];
  if (code === 113) return [{ id: `fort-${x}-${y}`, spawnLocationType: 2, cell: { x, y } }];
  if (code === 114) return [{ id: `tipi-${x}-${y}`, spawnLocationType: 3, cell: { x, y } }];
  return [];
}));

for (const [spawnLocationType, tileCode, name] of [
  [1, 112, 'Saloon'], [2, 113, 'Fort'], [3, 114, 'Tipi'],
] as const) {
  if (spawnLocations.filter(({ spawnLocationType: actual }) => actual === spawnLocationType).length !== 1
    || map.originalTileGrid.flat().filter((code) => code === tileCode).length !== 1) {
    throw new Error(`Lumber Mill Hills must have exactly one ${name} spawn location`);
  }
}

const fort = spawnLocations.find(({ spawnLocationType }) => spawnLocationType === 2)!;
const tipi = spawnLocations.find(({ spawnLocationType }) => spawnLocationType === 3)!;

/** Four original hire types use the map's Saloon, Fort, and Tipi pool locations. */
export const oregon10CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({
      poolType: 1, unitType: 'gunslinger', spawnLocationType: 1,
      template: createActiveGunslinger({ x: 0, y: 0 }),
    }),
    Object.freeze({
      poolType: 2, unitType: 'mexican', spawnLocationType: 1,
      template: createActiveMexicanUnit({ x: 0, y: 0 }),
    }),
    Object.freeze({
      poolType: 3, unitType: 'cannon', spawnLocationType: 2,
      template: createActiveFortKaboomUnit('cannon', fort.cell, 1),
    }),
    Object.freeze({
      poolType: 4, unitType: 'indian', spawnLocationType: 3,
      template: createActiveFortKaboomUnit('indian', tipi.cell, 1),
    }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ action: 'set' as const, waveNumber: 1, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 0 }),
      Object.freeze({ poolType: 2, count: 0 }),
      Object.freeze({ poolType: 3, count: 0 }),
      Object.freeze({ poolType: 4, count: 0 }),
    ]) }),
    Object.freeze({ action: 'set-max' as const, waveNumber: 1, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 6 }),
      Object.freeze({ poolType: 2, count: 6 }),
      Object.freeze({ poolType: 3, count: 6 }),
      Object.freeze({ poolType: 4, count: 6 }),
    ]) }),
  ]),
});
