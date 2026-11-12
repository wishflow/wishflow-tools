import map from './mississippi-13.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Golden River's TDM scenery and shared Mississippi terrain collision codes. */
export function createMississippi13MapScene() {
  return createMississippiMapScene(map);
}
