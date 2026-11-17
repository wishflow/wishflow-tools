import type { MapDecoration } from '../game';
import map from './oregon-10.json';
import { createMississippiMapScene } from './mississippi-map-scene';

const oregon10DecorationByCode: Readonly<Record<number, Omit<MapDecoration, 'cell'>>> = Object.freeze({
  118: { asset: 'e_1x1_tree_stump' },
});

/** Builds Lumber Mill Hills' Oregon terrain and all TDM-addressed scenery. */
export function createOregon10MapScene() {
  const scene = createMississippiMapScene(map);
  const decorations = [
    ...(scene.decorations ?? []),
    ...map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
      const decoration = oregon10DecorationByCode[code];
      return decoration ? [{ ...decoration, cell: { x, y } }] : [];
    })),
  ];
  return { ...scene, decorations };
}
