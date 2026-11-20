import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-06.json';
import { createDakota06MapScene } from '../src/content/dakota-06-scene';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;

const sceneryExpectations = [
  { marker: 69, asset: 'e_1x1_rocks_a', cells: [[18, 0], [31, 1], [22, 3], [30, 5], [0, 10], [4, 13], [17, 13], [22, 14], [31, 15], [8, 16], [9, 20], [4, 22], [27, 23]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 70, asset: 'e_1x1_rocks_b', cells: [[3, 0], [9, 0], [5, 11], [2, 23]], bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 } },
  { marker: 71, asset: 'e_1x1_tree', cells: [[28, 1], [16, 6], [1, 7], [11, 10], [31, 22]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 72, asset: 'b_1x1_stake', cells: [[24, 21]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 76, asset: 'e_1x1_bush', cells: [[22, 0], [0, 14], [0, 19]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 112, asset: 'b_3x2_saloon', cells: [[3, 3]], bounds: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 } },
  { marker: 113, asset: 'b_3x2_fort', cells: [[29, 8]], bounds: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 } },
  { marker: 114, asset: 'b_2x1_tipi', cells: [[21, 20]], bounds: { x: -5_184, y: -2_304, width: 10_368, height: 4_224 } },
  { marker: 116, asset: 'b_2x1_shack', cells: [[7, 0]], bounds: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 } },
  { marker: 117, asset: 'b_1x1_tipi_small', cells: [[24, 19], [20, 23]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

async function moveProbe(start: { x: number; y: number }, target: { x: number; y: number }) {
  const scene = createDakota06MapScene();
  const player = createActiveGunslinger(start, 36);
  const id = `ice-rocks-static-collision-${start.x}-${start.y}-${target.x}-${target.y}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Ice Rocks collision probe', zh: 'Ice Rocks 碰撞探针' },
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

test('Ice Rocks static TDM markers map to exact scenery, assets, anchors and collision boxes', () => {
  const scene = createDakota06MapScene();
  const decorations = scene.decorations ?? [];
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, decorations, undefined);

  for (const expected of sceneryExpectations) {
    assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} source cells`);
    const actual = decorations.filter(({ asset }) => asset === expected.asset);
    assert.deepEqual(actual.map(({ cell }) => [cell.x, cell.y]), expected.cells, `raw ${expected.marker} scene projection`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))), `${expected.asset} is bundled`);
    for (const [x, y] of expected.cells) {
      assert.deepEqual(
        collisions.filter(({ sourceTdmCode, sourceCell }) => sourceTdmCode === expected.marker
          && sourceCell?.x === x && sourceCell.y === y),
        [{
          x: (x * fineUnitsPerCell) + expected.bounds.x,
          y: (y * fineUnitsPerCell) + expected.bounds.y,
          width: expected.bounds.width,
          height: expected.bounds.height,
          sourceCell: { x, y },
          sourceTdmCode: expected.marker,
        }],
        `raw ${expected.marker} at (${x},${y}) has the APK collision rectangle`,
      );
    }
  }

  assert.equal(decorations.length, 32);
  assert.equal(collisions.length, 32);
  assert.deepEqual({
    saloonAnchorY: decorations.find(({ asset }) => asset === 'b_3x2_saloon')?.anchorOffsetY,
    fortAnchorY: decorations.find(({ asset }) => asset === 'b_3x2_fort')?.anchorOffsetY,
    tipiAnchorX: decorations.find(({ asset }) => asset === 'b_2x1_tipi')?.anchorOffsetX,
    tipiAnchorY: decorations.find(({ asset }) => asset === 'b_2x1_tipi')?.anchorOffsetY,
    shackAnchorX: decorations.find(({ asset }) => asset === 'b_2x1_shack')?.anchorOffsetX,
    shackFieldBlockBounds: decorations.find(({ asset }) => asset === 'b_2x1_shack')?.fieldBlockBounds,
  }, {
    saloonAnchorY: -0.3,
    fortAnchorY: -0.3,
    tipiAnchorX: -0.5,
    tipiAnchorY: -0.3,
    shackAnchorX: -0.5,
    shackFieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 },
  });
});

test('Ice Rocks rocks, Fort and stake block actual GameSession movement', async () => {
  const cases = [
    { marker: 69, cell: { x: 22, y: 14 }, start: { x: 19, y: 14 }, target: { x: 25, y: 14.75 }, axis: 'x' },
    { marker: 113, cell: { x: 29, y: 8 }, start: { x: 29.5, y: 5 }, target: { x: 29.5, y: 11 }, axis: 'y' },
    { marker: 72, cell: { x: 24, y: 21 }, start: { x: 21, y: 21 }, target: { x: 28, y: 21.75 }, axis: 'x' },
  ] as const;
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, createDakota06MapScene().decorations, undefined);

  for (const obstacle of cases) {
    const player = await moveProbe(obstacle.start, obstacle.target);
    const collision = collisions.find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === obstacle.marker
      && sourceCell?.x === obstacle.cell.x && sourceCell.y === obstacle.cell.y);
    assert.ok(collision, `raw ${obstacle.marker} has an audited collision box`);
    const playerBox = {
      x: player.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x,
      y: player.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
    };
    if (obstacle.axis === 'x') {
      assert.ok(playerBox.x + playerBox.width <= collision.x,
        `raw ${obstacle.marker} blocks horizontal movement before overlap: ${JSON.stringify({ position: player.positionFine, playerBox, collision })}`);
    } else {
      assert.ok(playerBox.y + playerBox.height <= collision.y,
        `raw ${obstacle.marker} blocks vertical movement before overlap: ${JSON.stringify({ position: player.positionFine, playerBox, collision })}`);
    }
  }
});
