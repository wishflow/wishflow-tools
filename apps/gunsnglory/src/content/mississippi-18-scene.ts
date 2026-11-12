import map from './mississippi-18.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Shadow Town scenery and Mississippi terrain collision from its APK TDM. */
export function createMississippi18MapScene() {
  return createMississippiMapScene(map);
}
