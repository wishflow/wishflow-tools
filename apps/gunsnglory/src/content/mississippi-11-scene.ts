import map from './mississippi-11.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Adds map14's TDM-created static scenery to the APK-derived terrain layers. */
export function createMississippi11MapScene() {
  return createMississippiMapScene(map);
}
