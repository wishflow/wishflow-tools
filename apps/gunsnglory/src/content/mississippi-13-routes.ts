import type { WaveRouteDefinition } from '../game';
import map from './mississippi-13.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Complete Golden River paths derived from APK action fields 52–65. */
export const mississippi13RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);
