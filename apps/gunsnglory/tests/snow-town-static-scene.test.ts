import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-09.json';
import { createDakota09MapScene } from '../src/content/dakota-09-scene';
import { createPlayerMapCollisionBoxes } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;
const defaultBounds = { x: 1_920, y: 2_612, width: 3_840, height: 2_534 };
const markerExpectations = [
  { marker: 69, asset: 'e_1x1_rocks_snow_a', cells: [[19, 0], [29, 0], [25, 4], [7, 17], [31, 18], [6, 20]], bounds: defaultBounds },
  { marker: 70, asset: 'e_1x1_rocks_snow_b', cells: [[3, 23], [23, 23]], bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 } },
  { marker: 71, asset: 'e_1x1_tree_snow', cells: [[0, 0], [6, 13], [1, 20]], bounds: defaultBounds },
  { marker: 72, asset: 'b_1x1_stake', cells: [[27, 21]], bounds: defaultBounds },
  { marker: 74, asset: 'b_1x1_windmill', cells: [[18, 14]], bounds: defaultBounds },
  { marker: 75, asset: 'b_1x1_watertower', cells: [[14, 7]], bounds: defaultBounds },
  { marker: 76, asset: 'e_1x1_bush', cells: [[14, 0], [23, 1], [3, 13], [0, 16], [29, 21]], bounds: defaultBounds },
  { marker: 86, asset: 'tiles_railway_buffers_hori_left', cells: [[0, 6]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
  { marker: 87, asset: 'tiles_railway_buffers_hori_right', cells: [[18, 6]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
  { marker: 112, asset: 'b_3x2_saloon', cells: [[19, 10], [15, 15]], bounds: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 } },
  { marker: 113, asset: 'b_3x2_fort', cells: [[30, 6]], bounds: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 } },
  { marker: 114, asset: 'b_2x1_tipi', cells: [[26, 19]], bounds: { x: -5_184, y: -2_304, width: 10_368, height: 4_224 } },
  { marker: 116, asset: 'b_2x1_shack', cells: [[15, 9], [27, 11], [15, 12], [21, 13]], bounds: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 } },
  { marker: 117, asset: 'b_1x1_tipi_small', cells: [[22, 21], [31, 22]], bounds: defaultBounds },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

test('Snow Town TDM scenery markers map to the exact APK assets and cells', () => {
  const scene = createDakota09MapScene();
  const decorations = scene.decorations ?? [];
  for (const expected of markerExpectations) {
    assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} TDM coordinates`);
    assert.deepEqual(
      decorations.filter(({ asset }) => asset === expected.asset).map(({ cell }) => [cell.x, cell.y]),
      expected.cells,
      `raw ${expected.marker} scene objects`,
    );
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))),
      `${expected.asset} is bundled at the path used by the renderer`);
  }
  assert.equal(decorations.length, 31, 'train consist remains a unit group, not duplicate scenery');
  assert.equal(decorations.some(({ asset }) => asset.startsWith('lok_')), false);
});

test('Snow Town static TDM object bounds match the APK collision geometry', () => {
  const scene = createDakota09MapScene();
  const collisionBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined);
  for (const expected of markerExpectations) {
    for (const [x, y] of expected.cells) {
      assert.deepEqual(
        collisionBoxes.filter(({ sourceTdmCode, sourceCell }) => sourceTdmCode === expected.marker
          && sourceCell?.x === x && sourceCell.y === y),
        [{
          x: (x * fineUnitsPerCell) + expected.bounds.x,
          y: (y * fineUnitsPerCell) + expected.bounds.y,
          width: expected.bounds.width,
          height: expected.bounds.height,
          sourceCell: { x, y },
          sourceTdmCode: expected.marker,
        }],
        `raw ${expected.marker} at (${x},${y}) collision bounds`,
      );
    }
  }
});
