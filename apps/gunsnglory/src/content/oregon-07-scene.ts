import type { MapDecoration } from '../game';
import map from './oregon-07.json';
import { createMississippiMapScene } from './mississippi-map-scene';

const oregon07DecorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  79: { asset: 'e_1x1_tree_green_a' },
  115: { asset: 'e_1x1_tree_green_b' },
  118: { asset: 'e_1x1_tree_stump' },
  119: { asset: 'e_1x1_tree_green_c' },
});

/** Builds Mount Hood's APK-derived terrain and shared collision grid. */
export function createOregon07MapScene() {
  const scene = createMississippiMapScene(map);
  const decorations = [
    ...(scene.decorations ?? []),
    ...map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
      const decoration = oregon07DecorationByCode[code];
      return decoration ? [{ ...decoration, cell: { x, y } }] : [];
    })),
  ];
  return { ...scene, decorations };
}
