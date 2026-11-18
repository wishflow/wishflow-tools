import type { MapDecoration } from '../game';
import map from './dakota-02.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const railwayBufferCollisionBox = Object.freeze({ x: 0, y: 0, width: 7_680, height: 7_680 });

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  72: { asset: 'b_1x1_stake' },
  75: { asset: 'b_1x1_watertower' },
  76: { asset: 'e_1x1_bush' },
  86: { asset: 'tiles_railway_buffers_hori_left', collisionBoxFine: railwayBufferCollisionBox },
  87: { asset: 'tiles_railway_buffers_hori_right', collisionBoxFine: railwayBufferCollisionBox },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  117: { asset: 'b_1x1_tipi_small' },
  126: { asset: 'e_1x1_rocks_water' },
});

/** Builds Six Grandfathers' Dakota scenery and final APK-shaped background codes. */
export function createDakota02MapScene() {
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
