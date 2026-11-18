import type { WaveRouteDefinition } from '../game';
import map from './dakota-03.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Fort Knockout's enemy paths expanded from the APK TDM route markers. */
export const dakota03RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);

const spawnActionIds = map.originalTileGrid.flatMap((row) => row
  .filter((code) => code >= 40 && code <= 46)
  .map((code) => code - 40));

/** Maps each APK spawn action to Fort Knockout's row-major web spawn point. */
export const dakota03SpawnPointIdByActionId: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId])),
);
