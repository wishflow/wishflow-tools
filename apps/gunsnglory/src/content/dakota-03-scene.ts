import type { MapDecoration } from '../game';
import map from './dakota-03.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  69: { asset: 'e_1x1_rocks_snow_a' },
  70: { asset: 'e_1x1_rocks_snow_b' },
  71: { asset: 'e_1x1_tree_snow' },
  76: { asset: 'e_1x1_bush' },
  94: { asset: 'tiles_railway_buffers_verti_up' },
  95: { asset: 'tiles_railway_buffers_verti_down' },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3 },
  116: {
    asset: 'b_2x1_shack',
    anchorOffsetX: -0.5,
    fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 },
  },
  117: { asset: 'b_1x1_tipi_small' },
});

/** Builds Fort Knockout's Dakota scenery; TDM codes remain the static collision source. */
export function createDakota03MapScene() {
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
