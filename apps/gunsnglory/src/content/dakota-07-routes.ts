import type { WaveRouteDefinition } from '../game';
import map from './dakota-07.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Frost Station enemy routes expanded from the APK map40 direction markers. */
export const dakota07RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Frost Station's row-major web spawn point. */
export const dakota07SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
