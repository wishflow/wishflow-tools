import map from './new-mexico-04.json';
import type { MapDecoration } from '../game';

const techTownDecorationCodes: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  68: { asset: 'e_1x1_cactus_a' },
  69: { asset: 'e_1x1_rocks_a' },
  70: { asset: 'e_1x1_rocks_b' },
  71: { asset: 'e_1x1_tree' },
  72: { asset: 'b_1x1_stake' },
  73: { asset: 'e_1x1_cactus_b' },
  74: { asset: 'b_1x1_windmill' },
  75: { asset: 'b_1x1_watertower' },
  76: { asset: 'e_1x1_bush' },
  77: { asset: 'e_1x2_bones' },
  86: { asset: 'tiles_railway_buffers_hori_left' },
  87: { asset: 'tiles_railway_buffers_hori_right' },
  112: { asset: 'b_3x2_saloon', anchorOffsetY: -0.3 },
  113: { asset: 'b_3x2_fort', anchorOffsetY: -0.3 },
  114: { asset: 'b_2x1_tipi', anchorOffsetX: -0.5, anchorOffsetY: -0.3 },
  116: { asset: 'b_2x1_shack', anchorOffsetX: -0.5 },
  117: { asset: 'b_1x1_tipi_small' },
  126: { asset: 'e_1x1_rocks_water' },
});

const casinoDecoration: Omit<MapDecoration, 'cell'> = Object.freeze({
  asset: 'b_3x2_casino',
  anchorOffsetY: -0.3,
});

export function createTechTownMapScene(options: { gamblerUnlocked?: boolean } = {}) {
  // Code 132 is the conditional Gambler unit and belongs to the stage's unit model.
  // Codes 105, 130 and 131 create units; they are not static scene decorations.
  const decorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    const decoration = code === 150
      ? options.gamblerUnlocked ? casinoDecoration : undefined
      : techTownDecorationCodes[code];
    return decoration ? [{ ...decoration, cell: { x, y } }] : [];
  }));

  return {
    ...map.map,
    decorations,
  };
}
