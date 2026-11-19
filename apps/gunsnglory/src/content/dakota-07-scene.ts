import map from './dakota-07.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

/** Builds Frost Station terrain and its APK-derived Dakota background collision grid. */
export function createDakota07MapScene() {
  return {
    ...map.map,
    backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    originalTileGrid: map.originalTileGrid,
  };
}
