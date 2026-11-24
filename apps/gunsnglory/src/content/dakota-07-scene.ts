import type { MapDecoration } from '../game';
import map from './dakota-07.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  69: { asset: 'e_1x1_rocks_snow_a' },
  70: { asset: 'e_1x1_rocks_snow_b' },
  75: { asset: 'b_1x1_watertower' },
  86: { asset: 'tiles_railway_buffers_hori_left' },
  87: { asset: 'tiles_railway_buffers_hori_right' },
});

/** Builds Frost Station terrain and its APK-derived Dakota background collision grid. */
export function createDakota07MapScene() {
  const decorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = decorationByCode[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));

  return {
    ...map.map,
    decorations,
    backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    originalTileGrid: map.originalTileGrid,
  };
}
