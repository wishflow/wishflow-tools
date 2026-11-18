import type { MapDecoration } from '../game';
import map from './oregon-11.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const oregon11DecorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  74: { asset: 'b_1x1_windmill' },
  76: { asset: 'e_1x1_bush' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  116: { asset: 'b_2x1_shack', anchorOffsetX: -0.5 },
  126: { asset: 'e_1x1_rocks_water' },
});

/** Builds Loot Lakes' Dakota terrain, static TDM scenery, and final APK-shaped background codes. */
export function createOregon11MapScene(gamblerUnlocked = false) {
  const decorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    if (code === 150 && gamblerUnlocked) {
      return [{ asset: 'b_3x2_casino', anchorOffsetY: -0.3, cell: { x, y } }];
    }
    const decoration = oregon11DecorationByCode[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));
  return {
    ...map.map,
    decorations,
    backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    originalTileGrid: map.originalTileGrid,
  };
}
