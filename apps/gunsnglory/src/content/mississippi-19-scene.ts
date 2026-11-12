import map from './mississippi-19.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Dust Falls scenery and Mississippi terrain collision from its APK TDM. */
export function createMississippi19MapScene() {
  return createMississippiMapScene(map);
}
