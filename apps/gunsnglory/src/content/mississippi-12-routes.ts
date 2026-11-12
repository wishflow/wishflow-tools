import type { WaveRouteDefinition } from '../game';
import map from './mississippi-12.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** Complete Steam Valley paths derived from APK action fields 52–65. */
export const mississippi12RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);
