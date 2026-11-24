import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;

const sceneryExpectations = [
  { marker: 69, asset: 'e_1x1_rocks_snow_a', cells: [[27, 1], [22, 6], [5, 14], [13, 18]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 70, asset: 'e_1x1_rocks_snow_b', cells: [[0, 14]], bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 } },
  { marker: 71, asset: 'e_1x1_tree_snow', cells: [[21, 9], [31, 13], [17, 19]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 74, asset: 'b_1x1_windmill', cells: [[20, 23]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 75, asset: 'b_1x1_watertower', cells: [[7, 2]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 76, asset: 'e_1x1_bush', cells: [[30, 4], [19, 8], [25, 19], [9, 23]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 86, asset: 'tiles_railway_buffers_hori_left', cells: [[2, 1]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
  { marker: 87, asset: 'tiles_railway_buffers_hori_right', cells: [[22, 1]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
  { marker: 112, asset: 'b_3x2_saloon', cells: [[24, 15]], bounds: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 } },
  { marker: 113, asset: 'b_3x2_fort', cells: [[7, 15]], bounds: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 } },
  { marker: 114, asset: 'b_2x1_tipi', cells: [[29, 21]], bounds: { x: -5_184, y: -2_304, width: 10_368, height: 4_224 } },
  { marker: 116, asset: 'b_2x1_shack', cells: [[27, 15], [1, 23]], bounds: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 } },
  { marker: 126, asset: 'e_1x1_rocks_water', cells: [[25, 10]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

async function moveProbe(start: { x: number; y: number }, target: { x: number; y: number }, obstacles: readonly ScenarioUnit[] = []) {
  const scene = createDakota05MapScene();
  const player = createActiveGunslinger(start, 35);
  const id = `ghost-town-static-collision-${start.x}-${start.y}-${target.x}-${target.y}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Ghost Town collision probe', zh: 'Ghost Town 碰撞探针' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [player, ...obstacles],
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

test('Ghost Town static TDM markers map to audited scenery, buildings, assets and collision boxes', () => {
  const scene = createDakota05MapScene();
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

  assert.equal(decorations.length, 22);
  assert.equal(decorations.some(({ asset }) => asset === 'b_3x2_casino'), false, 'no Casino is synthesized');
  assert.equal(decorations.some(({ asset }) => asset.startsWith('train-') || asset.includes('steamer')), false,
    'transport groups are kept for G2-C/G2-D');
  assert.equal(decorations.find(({ asset }) => asset === 'b_3x2_saloon')?.anchorOffsetY, -0.3);
  assert.equal(decorations.find(({ asset }) => asset === 'b_3x2_fort')?.anchorOffsetY, -0.3);
  assert.deepEqual({
    anchorOffsetX: decorations.find(({ asset }) => asset === 'b_2x1_tipi')?.anchorOffsetX,
    anchorOffsetY: decorations.find(({ asset }) => asset === 'b_2x1_tipi')?.anchorOffsetY,
  }, { anchorOffsetX: -0.5, anchorOffsetY: -0.3 });
  assert.deepEqual({
    anchorOffsetX: decorations.find(({ asset }) => asset === 'b_2x1_shack')?.anchorOffsetX,
    fieldBlockBounds: decorations.find(({ asset }) => asset === 'b_2x1_shack')?.fieldBlockBounds,
  }, { anchorOffsetX: -0.5, fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 } });
});

test('Ghost Town Saloon, Fort, Shack, water tower, rock, and rail buffer block real player movement', async () => {
  const staticCases = [
    { marker: 69, cell: { x: 5, y: 14 }, start: { x: 4, y: 14 }, target: { x: 7, y: 14.75 }, axis: 'x' },
    { marker: 112, cell: { x: 24, y: 15 }, start: { x: 21, y: 14 }, target: { x: 27, y: 14.75 }, axis: 'x' },
    { marker: 113, cell: { x: 7, y: 15 }, start: { x: 7, y: 13 }, target: { x: 7.5, y: 16 }, axis: 'y' },
    { marker: 116, cell: { x: 27, y: 15 }, start: { x: 27, y: 13 }, target: { x: 27.5, y: 17.5 }, axis: 'y' },
    { marker: 75, cell: { x: 7, y: 2 }, start: { x: 4, y: 2 }, target: { x: 10, y: 2.75 }, axis: 'x' },
    { marker: 86, cell: { x: 2, y: 1 }, start: { x: 2, y: 0 }, target: { x: 2.5, y: 2.5 }, axis: 'y' },
  ] as const;
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, createDakota05MapScene().decorations, undefined);

  for (const obstacle of staticCases) {
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
    if (obstacle.axis === 'x' && obstacle.target.x > obstacle.start.x) {
      assert.ok(playerBox.x + playerBox.width <= collision.x,
        `raw ${obstacle.marker} blocks horizontal GameSession movement before overlap: ${JSON.stringify({ position: player.positionFine, playerBox, collision })}`);
    } else if (obstacle.axis === 'y' && obstacle.target.y > obstacle.start.y) {
      assert.ok(playerBox.y + playerBox.height <= collision.y,
        `raw ${obstacle.marker} blocks vertical GameSession movement before overlap: ${JSON.stringify({ position: player.positionFine, playerBox, collision })}`);
    }
  }
});
