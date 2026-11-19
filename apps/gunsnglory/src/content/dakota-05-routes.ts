import type { WaveRouteDefinition } from '../game';
import map from './dakota-05.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Ghost Town enemy routes expanded from the APK map38 direction markers. */
export const dakota05RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Ghost Town's row-major web spawn point. */
export const dakota05SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
