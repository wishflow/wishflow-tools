import map from './mississippi-14.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Riverside Mountains' TDM scenery to the Mississippi terrain and collision layers. */
export function createMississippi14MapScene() {
  return createMississippiMapScene(map);
}
