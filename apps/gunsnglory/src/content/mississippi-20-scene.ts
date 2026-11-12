import map from './mississippi-20.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Horse Hills scenery and Mississippi terrain collision from its APK TDM. */
export function createMississippi20MapScene() {
  return createMississippiMapScene(map);
}
