import map from './new-mexico-04.json';
import type { CampaignUnitPoolDefinition, SpawnLocationType } from '../game';

const spawnLocationsByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  113: { id: 'fort', spawnLocationType: 2 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

function createSpawnLocations() {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const source = spawnLocationsByCode[code as keyof typeof spawnLocationsByCode];
    return source ? [{ ...source, cell: Object.freeze({ x, y }) }] : [];
  }));
}

const spawnLocations = Object.freeze(createSpawnLocations());
const spawnTypeByPoolType = Object.freeze({ 1: 1, 2: 1, 3: 2, 4: 3 } as const);

if (spawnLocations.length !== 3
  || ([112, 113, 114] as const).some((code) => !map.originalTileGrid.some((row) => row.includes(code)))) {
  throw new Error('Tech Town must have exactly one Saloon, Fort and Tipi spawn location');
}

const poolValues = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 0 })));
const poolMaximums = Object.freeze([1, 2, 3, 4].map((poolType) => Object.freeze({ poolType, count: 5 })));

/** Original type 1–4 player pools and wave-two set/set-max actions. */
export const techTownUnitPool: CampaignUnitPoolDefinition = Object.freeze({
  intervalMs: 15_000,
  units: Object.freeze([
    Object.freeze({ poolType: 1, unitType: 'gunslinger', spawnLocationType: spawnTypeByPoolType[1] as SpawnLocationType }),
    Object.freeze({ poolType: 2, unitType: 'mexican', spawnLocationType: spawnTypeByPoolType[2] as SpawnLocationType }),
    Object.freeze({ poolType: 3, unitType: 'cannon', spawnLocationType: spawnTypeByPoolType[3] as SpawnLocationType }),
    Object.freeze({ poolType: 4, unitType: 'indian', spawnLocationType: spawnTypeByPoolType[4] as SpawnLocationType }),
  ]),
  spawnLocations,
  actions: Object.freeze([
    Object.freeze({ waveNumber: 2, action: 'set' as const, values: poolValues }),
    Object.freeze({ waveNumber: 2, action: 'set-max' as const, values: poolMaximums }),
  ]),
});
