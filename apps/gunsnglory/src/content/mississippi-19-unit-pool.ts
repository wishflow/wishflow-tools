import type { CampaignUnitPoolDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './mississippi-19.json';

const spawnLocations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
  code === 114 ? [{ id: `tipi-${x}-${y}`, spawnLocationType: 3 as const, cell: { x, y } }] : []
)));

if (spawnLocations.length !== 1) throw new Error('Dust Falls must have exactly one Tipi spawn location');

/** This Indian exists only as a pool design; the TDM has no initial Indian unit marker. */
const indianTemplate = createActiveFortKaboomUnit('indian', spawnLocations[0]!.cell, 1);

export const mississippi19CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 4, unitType: 'indian', spawnLocationType: 3, template: indianTemplate }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 4, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 4, count: 2 }),
    ]) }),
    Object.freeze({ waveNumber: 4, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 4, count: 4 }),
    ]) }),
  ]),
});
