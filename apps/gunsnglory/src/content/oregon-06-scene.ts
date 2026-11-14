import type { MapDecoration } from '../game';
import map from './oregon-06.json';
import { createMississippiMapScene } from './mississippi-map-scene';

const oregon06DecorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  79: { asset: 'e_1x1_tree_green_a' },
  115: { asset: 'e_1x1_tree_green_b' },
  117: { asset: 'b_1x1_tipi_small' },
  118: { asset: 'e_1x1_tree_stump' },
  119: { asset: 'e_1x1_tree_green_c' },
});

/** Builds Columbia River's APK-derived terrain and shared collision grid. */
export function createOregon06MapScene() {
  const scene = createMississippiMapScene(map);
  const decorations = [
    ...(scene.decorations ?? []),
    ...map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
      const decoration = oregon06DecorationByCode[code];
      return decoration ? [{ ...decoration, cell: { x, y } }] : [];
    })),
  ];
  return { ...scene, decorations };
}
