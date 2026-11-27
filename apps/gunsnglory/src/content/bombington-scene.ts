import map from './nevada-02.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

/** Builds Bombington's Nevada terrain layers and final background grid from its APK-derived map. */
export function createBombingtonMapScene() {
  return {
    ...map.map,
    backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    originalTileGrid: map.originalTileGrid,
  };
}
