import map from './dakota-06.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

/** Builds Ice Rocks terrain and its APK-derived Dakota background collision grid. */
export function createDakota06MapScene() {
  return {
    ...map.map,
    decorations: [],
    backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    originalTileGrid: map.originalTileGrid,
  };
}
