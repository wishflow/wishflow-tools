import type { WaveRouteDefinition } from '../game';
import map from './oregon-11.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** All Loot Lakes routes expanded from its own TDM action markers. */
export const oregon11RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to its row-major web spawn point. */
export const oregon11SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
