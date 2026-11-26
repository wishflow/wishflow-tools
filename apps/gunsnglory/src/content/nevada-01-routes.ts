import type { WaveRouteDefinition } from '../game';
import map from './nevada-01.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Labyrinth Gulch routes expanded from the original map44 direction markers. */
export const nevada01RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to the row-major web spawn-point ID. */
export const nevada01SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
