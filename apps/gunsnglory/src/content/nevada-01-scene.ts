import type { MapDecoration } from '../game';
import map from './nevada-01.json';
import { createDakotaBackgroundCollisionCodes } from './dakota-background-collision';

const decorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  68: { asset: 'e_1x1_cactus_a' },
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  72: { asset: 'b_1x1_stake' },
  73: { asset: 'e_1x1_cactus_b' },
  74: { asset: 'b_1x1_windmill' },
  75: { asset: 'b_1x1_watertower' },
  76: { asset: 'e_1x1_bush' },
  117: { asset: 'b_1x1_tipi_small' },
});

/** Builds Labyrinth Gulch's static scenery from APK TDM markers and terrain. */
export function createNevada01MapScene() {
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
