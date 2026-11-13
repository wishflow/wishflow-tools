import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './oregon-03.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => (
  code === 114 ? [{ id: `tipi-${x}-${y}`, spawnLocationType: 3, cell: { x, y } }] : []
)));

if (spawnLocations.length !== 1) throw new Error('Chinook Woods must have exactly one Tipi spawn location');

/** The Indian pool uses the real Tipi and a pool-only design; no extra map unit is created. */
const indianTemplate = createActiveFortKaboomUnit('indian', spawnLocations[0]!.cell, 1);

export const oregon03CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // Reuse the web runtime's 15s pool cadence; the APK timer field's value is not established by the inspected methods.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 4, unitType: 'indian', spawnLocationType: 3, template: indianTemplate }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 4, count: 0 }),
    ]) }),
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 4, count: 5 }),
    ]) }),
  ]),
});
