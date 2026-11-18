import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition } from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import map from './dakota-03.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => (
  code === 113 ? [{ id: `fort-${x}-${y}`, spawnLocationType: 2, cell: { x, y } }] : []
)));

if (spawnLocations.length !== 2
  || !spawnLocations.some(({ cell }) => cell.x === 20 && cell.y === 3)
  || !spawnLocations.some(({ cell }) => cell.x === 8 && cell.y === 8)) {
  throw new Error('Fort Knockout must contain the two APK Fort spawn locations');
}

const cannonTemplate = createActiveFortKaboomUnit('cannon', spawnLocations[0]!.cell, 1);

/** Fort Knockout's pool-only Cannon design; this template is not a starting map unit. */
export const dakota03CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // The APK per-level pool cadence is not established; keep the shared web cadence.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 3, unitType: 'cannon', spawnLocationType: 2, template: cannonTemplate }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    // SET clears all 37 inventory slots; the only configured pool slot is Cannon (type 3).
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 3, count: 0 }),
    ]) }),
    // SET_MAX clears all caps before setting the APK's five-Cannon limit.
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 3, count: 5 }),
    ]) }),
  ]),
});
