import map from './dakota-08.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

/** Builds Wayne Waters terrain and its APK-derived Dakota background collision grid. */
export function createDakota08MapScene() {
  return {
    ...map.map,
    backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    originalTileGrid: map.originalTileGrid,
  };
}
