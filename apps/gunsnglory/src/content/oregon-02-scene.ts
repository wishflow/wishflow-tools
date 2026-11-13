import type { MapDecoration } from '../game';
import map from './oregon-02.json';
import { createMississippiMapScene } from './mississippi-map-scene';

const oregon02DecorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  79: { asset: 'e_1x1_tree_green_a' },
  115: { asset: 'e_1x1_tree_green_b' },
  118: { asset: 'e_1x1_tree_stump' },
  119: { asset: 'e_1x1_tree_green_c' },
});

/** Builds Cashcow Canyon with Oregon's aliased atlases and APK-derived collision codes. */
export function createOregon02MapScene() {
  const scene = createMississippiMapScene(map);
  const decorations = [
    ...(scene.decorations ?? []),
    ...map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
      const decoration = oregon02DecorationByCode[code];
      return decoration ? [{ ...decoration, cell: { x, y } }] : [];
    })),
  ];
  return { ...scene, decorations };
}
