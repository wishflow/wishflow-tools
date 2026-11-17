import type {
  CampaignUnitPoolDefinition,
  CampaignUnitSpawnLocationDefinition,
} from '../game';
import { createActiveFortKaboomUnit } from './fort-kaboom-unit-designs';
import { createActiveMexicanUnit } from './new-mexico-unit-entities';
import map from './oregon-08.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
  if (code === 112) return [{ id: `saloon-${x}-${y}`, spawnLocationType: 1, cell: { x, y } }];
  if (code === 113) return [{ id: `fort-${x}-${y}`, spawnLocationType: 2, cell: { x, y } }];
  if (code === 114) return [{ id: `tipi-${x}-${y}`, spawnLocationType: 3, cell: { x, y } }];
  return [];
}));

const expectedBuildings = [
  { tileCode: 112, spawnLocationType: 1, count: 2, name: 'Saloon' },
  { tileCode: 113, spawnLocationType: 2, count: 1, name: 'Fort' },
  { tileCode: 114, spawnLocationType: 3, count: 1, name: 'Tipi' },
] as const;

for (const { tileCode, spawnLocationType, count, name } of expectedBuildings) {
  const markerCount = map.originalTileGrid.flat().filter((code) => code === tileCode).length;
  const spawnLocationCount = spawnLocations.filter((location) => location.spawnLocationType === spawnLocationType).length;
  if (markerCount !== count || spawnLocationCount !== count) {
    throw new Error(`Colt City must have ${count} ${name} spawn location(s); found ${spawnLocationCount}`);
  }
}

const fort = spawnLocations.find(({ spawnLocationType }) => spawnLocationType === 2)!;
const cannonTemplate = createActiveFortKaboomUnit('cannon', fort.cell, 1);
const mexicanTemplate = createActiveMexicanUnit({ x: 0, y: 0 }, 90);

/** Uses the original Saloon/Fort/Tipi cells; Cannon is a pool-only Fort template. */
export const oregon08CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // Preserve the shared web cadence; the APK's final pool timer assignment is not established.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 }),
    Object.freeze({ poolType: 2, unitType: 'mexican', spawnLocationType: 1, template: mexicanTemplate }),
    Object.freeze({ poolType: 3, unitType: 'cannon', spawnLocationType: 2, template: cannonTemplate }),
    Object.freeze({ poolType: 4, unitType: 'indian', spawnLocationType: 3 }),
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
      Object.freeze({ poolType: 1, count: 3 }),
      Object.freeze({ poolType: 2, count: 3 }),
      Object.freeze({ poolType: 3, count: 3 }),
      Object.freeze({ poolType: 4, count: 3 }),
    ]) }),
  ]),
});
