import type { WaveRouteDefinition } from '../game';
import map from './nevada-02.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Complete Bombington paths expanded from the APK's map 45 direction markers. */
export const bombingtonRouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to the row-major web spawn-point ID. */
export const bombingtonSpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
