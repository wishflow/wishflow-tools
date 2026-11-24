import type { WaveRouteDefinition } from '../game';
import map from './dakota-09.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Snow Town enemy routes expanded from the APK map42 direction markers. */
export const dakota09RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Snow Town's row-major web spawn point. */
export const dakota09SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
