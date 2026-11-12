import type { WaveRouteDefinition } from '../game';
import map from './mississippi-15.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Complete Railroad Canyon paths derived from APK action fields 52–65. */
export const mississippi15RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);
