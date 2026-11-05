import map from './new-mexico-03.json';
import type { CampaignUnitPoolDefinition } from '../game';

const fortSpawnLocations = Object.freeze(map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
  code === 113
    ? [{ id: 'fort', spawnLocationType: 2 as const, cell: Object.freeze({ x, y }) }]
    : []
))));

if (fortSpawnLocations.length !== 1) {
  throw new Error('Fort Kaboom must have exactly one TDM Fort spawn location');
}

/** Player-unit pool actions recovered from GameDesignWaves and SpawnPoolManager. */
export const fortKaboomUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 3, unitType: 'cannon', spawnLocationType: 2 as const }),
  ]),
  spawnLocations: fortSpawnLocations,
  actions: Object.freeze([
    Object.freeze({ waveNumber: 4, action: 'set' as const, poolType: 3, count: 1 }),
    Object.freeze({ waveNumber: 4, action: 'set-max' as const, poolType: 3, count: 5 }),
  ]),
});
