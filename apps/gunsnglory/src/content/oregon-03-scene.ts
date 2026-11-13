import type { MapDecoration } from '../game';
import map from './oregon-03.json';
import { createMississippiMapScene } from './mississippi-map-scene';

const stakeCollisionBox = Object.freeze({ x: 1920, y: 2612, width: 3840, height: 2534 });

const oregon03DecorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  72: { asset: 'b_1x1_stake', collisionBoxFine: stakeCollisionBox },
  79: { asset: 'e_1x1_tree_green_a' },
  115: { asset: 'e_1x1_tree_green_b' },
  117: { asset: 'b_1x1_tipi_small' },
  118: { asset: 'e_1x1_tree_stump' },
  119: { asset: 'e_1x1_tree_green_c' },
});

/** Builds Chinook Woods with Oregon-specific TDM decorations and shared collision rules. */
export function createOregon03MapScene() {
  const scene = createMississippiMapScene(map);
  const decorations = [
    ...(scene.decorations ?? []),
    ...map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
      const decoration = oregon03DecorationByCode[code];
      return decoration ? [{ ...decoration, cell: { x, y } }] : [];
    })),
  ];
  return { ...scene, decorations };
}
