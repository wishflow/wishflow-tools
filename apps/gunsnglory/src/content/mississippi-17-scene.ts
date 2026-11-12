import map from './mississippi-17.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Dead Rocks scenery and Mississippi terrain collision from its APK TDM. */
export function createMississippi17MapScene() {
  return createMississippiMapScene(map);
}
