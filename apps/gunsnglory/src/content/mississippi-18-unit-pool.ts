import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './mississippi-18.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
  if (code === 112) return [{ id: `saloon-${x}-${y}`, spawnLocationType: 1 as const, cell: { x, y } }];
  if (code === 113) return [{ id: `fort-${x}-${y}`, spawnLocationType: 2 as const, cell: { x, y } }];
  return [];
}));
const forts = spawnLocations.filter(({ spawnLocationType }) => spawnLocationType === 2);
const saloons = spawnLocations.filter(({ spawnLocationType }) => spawnLocationType === 1);

if (saloons.length !== 2 || forts.length !== 1) throw new Error('Shadow Town must have two Saloons and one Fort');

/** The pool-only Cannon template is anchored to the real Fort without creating a map unit. */
const cannonTemplate = createActiveFortKaboomUnit('cannon', forts[0]!.cell, 1);
const mexicanTemplate = createActiveMexicanUnit(saloons[0]!.cell, 1);

export const mississippi18CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 }),
    Object.freeze({ poolType: 2, unitType: 'mexican', spawnLocationType: 1, template: mexicanTemplate }),
    Object.freeze({ poolType: 3, unitType: 'cannon', spawnLocationType: 2, template: cannonTemplate }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 2, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 2 }),
      Object.freeze({ poolType: 2, count: 2 }),
      Object.freeze({ poolType: 3, count: 1 }),
    ]) }),
    Object.freeze({ waveNumber: 2, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 6 }),
      Object.freeze({ poolType: 2, count: 4 }),
      Object.freeze({ poolType: 3, count: 2 }),
    ]) }),
  ]),
});
