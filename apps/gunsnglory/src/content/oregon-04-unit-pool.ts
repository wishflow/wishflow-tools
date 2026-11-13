import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './oregon-04.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => (
  code === 113 ? [{ id: `fort-${x}-${y}`, spawnLocationType: 2, cell: { x, y } }] : []
)));

if (spawnLocations.length !== 1) throw new Error('Fort Echo must have exactly one Fort spawn location');

/** The Cannon pool uses the real Fort and a pool-only template; it does not create another map unit. */
const cannonTemplate = createActiveFortKaboomUnit('cannon', spawnLocations[0]!.cell, 1);

export const oregon04CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // The APK timer's campaign value is not established by the reviewed methods; keep the shared web cadence.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 3, unitType: 'cannon', spawnLocationType: 2, template: cannonTemplate }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 3, count: 0 }),
    ]) }),
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 3, count: 4 }),
    ]) }),
  ]),
});
