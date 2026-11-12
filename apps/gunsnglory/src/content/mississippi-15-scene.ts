import map from './mississippi-15.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Railroad Canyon scenery and Mississippi terrain collision from its APK TDM. */
export function createMississippi15MapScene() {
  return createMississippiMapScene(map);
}
