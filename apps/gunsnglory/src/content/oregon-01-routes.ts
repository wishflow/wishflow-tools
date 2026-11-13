import type { WaveRouteDefinition } from '../game';
import map from './oregon-01.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** All complete Eastwood Forest paths, grouped in TDM row-major spawn order. */
export const oregon01RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Converts APK route action IDs to this map's row-major web spawn IDs. */
export const oregon01SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
