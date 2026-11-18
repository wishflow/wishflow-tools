import type { WaveRouteDefinition } from '../game';
import map from './dakota-02.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** All Six Grandfathers paths expanded from this map's APK action markers. */
export const dakota02RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to this map's row-major web spawn point. */
export const dakota02SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
