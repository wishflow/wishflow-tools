import type { CampaignUnitSpawnLocationDefinition } from '../game';
import map from './nevada-02.json';

const spawnLocationByCode = Object.freeze({
  112: { id: 'saloon', spawnLocationType: 1 as const },
  113: { id: 'fort', spawnLocationType: 2 as const },
  114: { id: 'tipi', spawnLocationType: 3 as const },
});

/** Decodes Bombington's player-unit spawn buildings directly from the APK TDM markers. */
export const bombingtonSpawnLocations: readonly CampaignUnitSpawnLocationDefinition[] = Object.freeze(
  map.originalTileGrid.flatMap((row, y) => row.flatMap<CampaignUnitSpawnLocationDefinition>((code, x) => {
    const location = spawnLocationByCode[code as keyof typeof spawnLocationByCode];
    return location ? [{ ...location, cell: { x, y } }] : [];
  })).map((location) => Object.freeze({
    ...location,
    cell: Object.freeze({ ...location.cell }),
  })),
);
