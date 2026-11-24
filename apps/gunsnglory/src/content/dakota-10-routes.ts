import type { WaveRouteDefinition } from '../game';
import map from './dakota-10.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Sioux Falls enemy routes expanded from the APK map43 direction markers. */
export const dakota10RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Sioux Falls' row-major web spawn point. */
export const dakota10SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
