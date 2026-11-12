import type { CampaignUnitPoolDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './mississippi-20.json';

const spawnLocations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
  code === 114 ? [{ id: `tipi-${x}-${y}`, spawnLocationType: 3 as const, cell: { x, y } }] : []
)));

if (spawnLocations.length !== 1) throw new Error(`Horse Hills must have exactly one Tipi spawn; found ${spawnLocations.length}`);

/** The Indian design belongs to the Tipi pool; it is not an initial map unit. */
const indianTemplate = createActiveFortKaboomUnit('indian', spawnLocations[0]!.cell, 1);

export const mississippi20CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 4, unitType: 'indian', spawnLocationType: 3, template: indianTemplate }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 2, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 4, count: 2 }),
    ]) }),
    Object.freeze({ waveNumber: 2, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 4, count: 4 }),
    ]) }),
  ]),
});
