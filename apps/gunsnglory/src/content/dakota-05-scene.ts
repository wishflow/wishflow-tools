import type { MapDecoration } from '../game';
import map from './dakota-05.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  74: { asset: 'b_1x1_windmill' },
  75: { asset: 'b_1x1_watertower' },
  76: { asset: 'e_1x1_bush' },
  86: { asset: 'tiles_railway_buffers_hori_left' },
  87: { asset: 'tiles_railway_buffers_hori_right' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3 },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  116: {
    asset: 'b_2x1_shack',
    anchorOffsetX: -0.5,
    fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 },
  },
  126: { asset: 'e_1x1_rocks_water' },
});

/** Builds Ghost Town's Dakota terrain and static TDM scenery. */
export function createDakota05MapScene() {
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
