import map from './mississippi-16.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds Highpoint Terrace scenery and Mississippi terrain collision from its APK TDM. */
export function createMississippi16MapScene() {
  return createMississippiMapScene(map);
}
