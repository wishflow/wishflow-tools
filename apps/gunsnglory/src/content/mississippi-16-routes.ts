import type { WaveRouteDefinition } from '../game';
import map from './mississippi-16.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** APK action markers expanded into every Mississippi campaign route. */
export const mississippi16RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);
