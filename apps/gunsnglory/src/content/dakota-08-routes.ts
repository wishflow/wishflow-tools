import type { WaveRouteDefinition } from '../game';
import map from './dakota-08.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Wayne Waters enemy routes expanded from the APK map41 direction markers. */
export const dakota08RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Wayne Waters' row-major web spawn point. */
export const dakota08SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
