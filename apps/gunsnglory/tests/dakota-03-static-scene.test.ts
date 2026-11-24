import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-03.json';
import { createDakota03MapScene } from '../src/content/dakota-03-scene';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;

const sceneryExpectations = [
  {
    marker: 69,
    asset: 'e_1x1_rocks_snow_a',
    cells: [[22, 0], [0, 4], [30, 6], [29, 11], [13, 12], [31, 15], [1, 22], [9, 23], [28, 23]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 70,
    asset: 'e_1x1_rocks_snow_b',
    cells: [[0, 0], [18, 5], [3, 21]],
    bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 },
  },
  {
    marker: 71,
    asset: 'e_1x1_tree_snow',
    cells: [[17, 2], [29, 3], [7, 5], [24, 17], [2, 19], [30, 22]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 76,
    asset: 'e_1x1_bush',
    cells: [[31, 1], [25, 10], [3, 16]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 94,
    asset: 'tiles_railway_buffers_verti_up',
    cells: [[11, 1]],
    bounds: { x: 0, y: 0, width: 7_680, height: 7_680 },
  },
  {
    marker: 95,
    asset: 'tiles_railway_buffers_verti_down',
    cells: [[11, 21]],
    bounds: { x: 0, y: 0, width: 7_680, height: 7_680 },
  },
  {
    marker: 113,
    asset: 'b_3x2_fort',
    cells: [[20, 3], [8, 8]],
    bounds: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 },
  },
  {
    marker: 116,
    asset: 'b_2x1_shack',
    cells: [[14, 15]],
    bounds: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 },
  },
  {
    marker: 117,
    asset: 'b_1x1_tipi_small',
    cells: [[4, 1], [1, 2]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

async function moveProbe(start: { x: number; y: number }, target: { x: number; y: number }) {
  const scene = createDakota03MapScene();
  const player = createActiveGunslinger(start, 93);
  const id = `fort-knockout-static-collision-${start.x}-${start.y}-${target.x}-${target.y}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Fort Knockout collision probe', zh: 'Fort Knockout 碰撞探针' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [player],
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < 45; frame += 1) view = session.advance({ deltaMs: 100 });
    const moved = view.units.find(({ id: unitId }) => unitId === player.id);
    assert.ok(moved);
    return moved;
  } finally {
    session.close();
  }
}

test('Fort Knockout Dakota scene matches static TDM scenery and APK collision bounds', () => {
  const scene = createDakota03MapScene();
  const decorations = scene.decorations ?? [];
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, decorations, undefined);

  for (const expected of sceneryExpectations) {
    assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} APK cells`);
    const actual = decorations.filter(({ asset }) => asset === expected.asset);
    assert.deepEqual(actual.map(({ cell }) => [cell.x, cell.y]), expected.cells, `raw ${expected.marker} rendered cells`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))), `${expected.asset} is bundled`);
    for (const [x, y] of expected.cells) {
      assert.deepEqual(
        collisions.filter(({ sourceTdmCode, sourceCell }) => sourceTdmCode === expected.marker
          && sourceCell?.x === x && sourceCell.y === y),
        [{
          x: (x * FINE_PER_CELL) + expected.bounds.x,
          y: (y * FINE_PER_CELL) + expected.bounds.y,
          width: expected.bounds.width,
          height: expected.bounds.height,
          sourceCell: { x, y },
          sourceTdmCode: expected.marker,
        }],
        `raw ${expected.marker} at (${x},${y}) uses the APK collision frame`,
      );
    }
  }

  assert.equal(decorations.length, 28);
  assert.equal(scene.decorations?.find(({ asset }) => asset === 'b_3x2_fort')?.anchorOffsetY, -0.3);
  assert.deepEqual({
    anchorOffsetX: scene.decorations?.find(({ asset }) => asset === 'b_2x1_shack')?.anchorOffsetX,
    fieldBlockBounds: scene.decorations?.find(({ asset }) => asset === 'b_2x1_shack')?.fieldBlockBounds,
  }, { anchorOffsetX: -0.5, fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 } });
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
});

test('Fort Knockout static Fort, shack, large rock, tipi, and railway buffer block actual player movement', async () => {
  const scene = createDakota03MapScene();
  const cases = [
    { marker: 113, cell: { x: 8, y: 8 }, start: { x: 4, y: 8 }, target: { x: 13, y: 8.75 }, axis: 'x' },
    { marker: 116, cell: { x: 14, y: 15 }, start: { x: 10, y: 15 }, target: { x: 17, y: 15.75 }, axis: 'x' },
    { marker: 70, cell: { x: 18, y: 5 }, start: { x: 18, y: 1 }, target: { x: 18.75, y: 9 }, axis: 'y' },
    { marker: 117, cell: { x: 4, y: 1 }, start: { x: 1, y: 1 }, target: { x: 8, y: 1.75 }, axis: 'x' },
    { marker: 94, cell: { x: 11, y: 1 }, start: { x: 8, y: 1 }, target: { x: 15, y: 1.75 }, axis: 'x' },
  ] as const;

  for (const obstacle of cases) {
    const moved = await moveProbe(obstacle.start, obstacle.target);
    const collision = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined)
      .find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === obstacle.marker
        && sourceCell?.x === obstacle.cell.x && sourceCell.y === obstacle.cell.y);
    assert.ok(collision, `raw ${obstacle.marker} has an APK blocker`);
    const playerEdge = obstacle.axis === 'x'
      ? moved.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width
      : moved.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y + PLAYER_UNIT_COLLIDER_FINE.height;
    const obstacleEdge = obstacle.axis === 'x' ? collision.x : collision.y;
    assert.ok(playerEdge <= obstacleEdge, `raw ${obstacle.marker} blocks before its near edge: ${JSON.stringify({ position: moved.positionFine, playerEdge, collision })}`);
    assert.ok(obstacleEdge - playerEdge < FINE_PER_CELL,
      `the player reaches raw ${obstacle.marker} and does not stop earlier on unrelated terrain`);
  }
});
