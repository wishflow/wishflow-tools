import map from './dakota-05.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

/** Builds Ghost Town's Dakota terrain scene; TDM codes remain the collision source. */
export function createDakota05MapScene() {
  return {
    ...map.map,
    backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    originalTileGrid: map.originalTileGrid,
  };
}
