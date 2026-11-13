import type { CampaignUnitPoolDefinition, CampaignUnitSpawnLocationDefinition } from '../game';
import map from './oregon-05.json';

const spawnLocations: CampaignUnitSpawnLocationDefinition[] = map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
  if (code === 112) return [{ id: `saloon-${x}-${y}`, spawnLocationType: 1, cell: { x, y } }];
  if (code === 114) return [{ id: `tipi-${x}-${y}`, spawnLocationType: 3, cell: { x, y } }];
  return [];
}));

if (spawnLocations.filter(({ spawnLocationType }) => spawnLocationType === 1).length !== 1
  || spawnLocations.filter(({ spawnLocationType }) => spawnLocationType === 3).length !== 1
  || spawnLocations.some(({ spawnLocationType }) => spawnLocationType === 2)) {
  throw new Error('Dynamite Plains must have one Saloon and one Tipi, and no Fort spawn location');
}

export const oregon05CampaignUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  // Keep the app's established cadence; the APK's final campaign timer assignment is not confirmed.
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 }),
    Object.freeze({ poolType: 2, unitType: 'mexican', spawnLocationType: 1 }),
    Object.freeze({ poolType: 4, unitType: 'indian', spawnLocationType: 3 }),
  ]),
  spawnLocations: Object.freeze(spawnLocations.map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  }))),
  actions: Object.freeze([
    Object.freeze({ waveNumber: 1, action: 'set' as const, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 0 }),
      Object.freeze({ poolType: 2, count: 0 }),
      Object.freeze({ poolType: 4, count: 0 }),
    ]) }),
    Object.freeze({ waveNumber: 1, action: 'set-max' as const, values: Object.freeze([
      Object.freeze({ poolType: 1, count: 3 }),
      Object.freeze({ poolType: 2, count: 3 }),
      Object.freeze({ poolType: 4, count: 3 }),
    ]) }),
  ]),
});
