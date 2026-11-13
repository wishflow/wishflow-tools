import type { WaveRouteDefinition } from '../game';
import map from './oregon-03.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** All Chinook Woods paths reconstructed from the APK TDM's direction markers. */
export const oregon03RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Converts APK route action IDs to this map's row-major web spawn IDs. */
export const oregon03SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
