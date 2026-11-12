import type { WaveRouteDefinition } from '../game';
import map from './mississippi-17.json';
import { createMississippiRouteDefinitions } from './mississippi-map-routes';

/** APK action markers expanded into every Dead Rocks campaign route. */
export const mississippi17RouteDefinitions: readonly WaveRouteDefinition[] = createMississippiRouteDefinitions(map);
