import type { MapDecoration } from '../game';
import map from './dakota-10.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  69: { asset: 'e_1x1_rocks_snow_a' },
  70: { asset: 'e_1x1_rocks_snow_b' },
  71: { asset: 'e_1x1_tree_snow' },
  72: { asset: 'b_1x1_stake' },
  76: { asset: 'e_1x1_bush' },
  94: { asset: 'tiles_railway_buffers_verti_up' },
  95: { asset: 'tiles_railway_buffers_verti_down' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3 },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  116: {
    asset: 'b_2x1_shack',
    anchorOffsetX: -0.5,
    fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 },
  },
  117: { asset: 'b_1x1_tipi_small' },
  126: { asset: 'e_1x1_rocks_water' },
});

/** Builds Sioux Falls scenery and Dakota background collision codes from APK TDM markers. */
export function createDakota10MapScene() {
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
