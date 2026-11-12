import map from './mississippi-12.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Steam Valley's TDM scenery and shared Mississippi terrain collision codes. */
export function createMississippi12MapScene() {
  return createMississippiMapScene(map);
}
