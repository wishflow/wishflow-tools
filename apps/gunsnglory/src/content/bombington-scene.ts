import type { MapDecoration } from '../game';
import map from './nevada-02.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  69: { asset: 'e_1x1_rocks_a' },
  71: { asset: 'e_1x1_tree' },
  73: { asset: 'e_1x1_cactus_b' },
  74: { asset: 'b_1x1_windmill' },
  75: { asset: 'b_1x1_watertower' },
  76: { asset: 'e_1x1_bush' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3 },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  117: { asset: 'b_1x1_tipi_small' },
  118: { asset: 'e_1x1_tree_stump' },
});

/** Builds Bombington's Nevada terrain layers and final background grid from its APK-derived map. */
export function createBombingtonMapScene() {
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
