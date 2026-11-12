import type { WaveRouteDefinition } from '../game';
import map from './mississippi-14.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Complete Riverside Mountains paths derived from APK action fields 52–65. */
export const mississippi14RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);
