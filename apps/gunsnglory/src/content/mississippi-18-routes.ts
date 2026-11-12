import type { WaveRouteDefinition } from '../game';
import map from './mississippi-18.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** All complete Shadow Town routes, grouped in TDM row-major spawn order. */
export const mississippi18RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Converts APK marker action IDs to the web campaign spawn array indices. */
export const mississippi18SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
