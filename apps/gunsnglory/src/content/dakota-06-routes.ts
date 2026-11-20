import type { WaveRouteDefinition } from '../game';
import map from './dakota-06.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Ice Rocks enemy routes expanded from the APK map39 direction markers. */
export const dakota06RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Ice Rocks' row-major web spawn point. */
export const dakota06SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
