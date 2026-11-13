import map from './oregon-01.json';
import { createMississippiMapScene } from './mississippi-map-scene';

/** Builds Eastwood Forest with the shared TDM terrain/collision rules and Oregon's aliased atlases. */
export function createOregon01MapScene(gamblerUnlocked = false) {
  const scene = createMississippiMapScene(map);
  const decorations = [
    ...(scene.decorations ?? []),
    ...map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
      code === 79 ? [{ asset: 'e_1x1_tree_green_a', cell: { x, y } }] : []
    ))),
    ...(gamblerUnlocked ? map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
      code === 150 ? [{ asset: 'b_3x2_casino', anchorOffsetY: -0.3, cell: { x, y } }] : []
    ))) : []),
  ];
  return { ...scene, decorations };
}
