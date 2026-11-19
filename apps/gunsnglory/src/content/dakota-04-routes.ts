import type { WaveRouteDefinition } from '../game';
import map from './dakota-04.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Badlands enemy routes expanded from the APK map37 direction markers. */
export const dakota04RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Badlands' row-major web spawn point. */
export const dakota04SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
