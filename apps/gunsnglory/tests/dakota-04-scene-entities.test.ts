import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { campaignCatalog } from '../src/content/campaign-catalog';
import { createDakota04DynamiteDefinition } from '../src/content/dakota-04-dynamite';
import map from '../src/content/dakota-04.json';
import { createDakota04MapScene } from '../src/content/dakota-04-scene';
import { createDakota04TrainUnits } from '../src/content/dakota-04-trains';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { createGame, type ScenarioContent } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_UNITS_PER_CELL = 7_680;

const sceneryExpectations = [
  {
    marker: 69,
    asset: 'e_1x1_rocks_snow_a',
    cells: [[11, 0], [20, 9], [4, 10], [6, 16], [4, 22], [31, 23]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 70,
    asset: 'e_1x1_rocks_snow_b',
    cells: [[1, 4], [12, 7], [18, 16], [0, 23]],
    bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 },
  },
  {
    marker: 71,
    asset: 'e_1x1_tree_snow',
    cells: [[30, 0], [17, 2], [25, 13], [31, 14], [20, 23]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 75,
    asset: 'b_1x1_watertower',
    cells: [[1, 10]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 76,
    asset: 'e_1x1_bush',
    cells: [[14, 12], [4, 14], [18, 20]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 94,
    asset: 'tiles_railway_buffers_verti_up',
    cells: [[2, 1]],
    bounds: { x: 0, y: 0, width: 7_680, height: 7_680 },
  },
  {
    marker: 95,
    asset: 'tiles_railway_buffers_verti_down',
    cells: [[2, 22]],
    bounds: { x: 0, y: 0, width: 7_680, height: 7_680 },
  },
  {
    marker: 116,
    asset: 'b_2x1_shack',
    cells: [[5, 0]],
    bounds: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 },
  },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function campaignScenarioIdForLevel(level: number): string {
  const entry = campaignCatalog.find((candidate) => candidate.level === level);
  assert.ok(entry, `campaign level ${level} is registered`);
  const levelWithinRegion = ((level - 1) % 10) + 1;
  return `campaign-${entry.regionId}-${String(levelWithinRegion).padStart(2, '0')}`;
}

test('Badlands scene maps every static TDM marker to its APK asset and collision frame', () => {
  const scene = createDakota04MapScene();
  const decorations = scene.decorations ?? [];
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, decorations, undefined);

  for (const expected of sceneryExpectations) {
    assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} APK cells`);
    const rendered = decorations.filter(({ asset }) => asset === expected.asset);
    assert.deepEqual(rendered.map(({ cell }) => [cell.x, cell.y]), expected.cells,
      `raw ${expected.marker} renders at every marker`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))),
      `${expected.asset} is bundled`);
    for (const [x, y] of expected.cells) {
      assert.deepEqual(
        collisions.filter(({ sourceTdmCode, sourceCell }) => sourceTdmCode === expected.marker
          && sourceCell?.x === x && sourceCell.y === y),
        [{
          x: (x * FINE_UNITS_PER_CELL) + expected.bounds.x,
          y: (y * FINE_UNITS_PER_CELL) + expected.bounds.y,
          width: expected.bounds.width,
          height: expected.bounds.height,
          sourceCell: { x, y },
          sourceTdmCode: expected.marker,
        }],
        `raw ${expected.marker} at (${x},${y}) uses the APK collision frame`,
      );
    }
  }

  assert.equal(decorations.length, 22);
  assert.deepEqual({
    anchorOffsetX: decorations.find(({ asset }) => asset === 'b_2x1_shack')?.anchorOffsetX,
    fieldBlockBounds: decorations.find(({ asset }) => asset === 'b_2x1_shack')?.fieldBlockBounds,
  }, { anchorOffsetX: -0.5, fieldBlockBounds: { left: -1, right: 1, top: 0, bottom: 0 } });
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
});

test('Badlands raw91/raw92 train markers form one ordered two-wagon, two-engine group', () => {
  assert.deepEqual(markerCells(92), [[2, 3], [2, 4]]);
  assert.deepEqual(markerCells(91), [[2, 5], [2, 6]]);

  const train = createDakota04TrainUnits();
  assert.deepEqual(train.map(({ id, type, activity, movementAxis, asset, cell, frame }) => [
    id, type, activity, movementAxis, asset, cell.x, cell.y, frame?.height,
  ]), [
    ['dakota-04-train-1-22-2-3', 'train-22', 4, 'vertical', 'lok_wagon_verti', 2, 3, 60],
    ['dakota-04-train-1-22-2-4', 'train-22', 4, 'vertical', 'lok_wagon_verti', 2, 4, 60],
    ['dakota-04-train-1-20-2-5', 'train-20', 5, 'vertical', 'lok_verti_2of2', 2, 5, 60],
    ['dakota-04-train-1-21-2-6', 'train-21', 5, 'vertical', 'lok_verti_1of2', 2, 6, 48],
  ]);
  assert.equal(new Set(train.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(train.every(({ collisionBoxFine }) => JSON.stringify(collisionBoxFine) === JSON.stringify({
    x: -2_534, y: -3_840, width: 4_608, height: 7_680,
  })));
  for (const asset of ['lok_wagon_verti', 'lok_verti_2of2', 'lok_verti_1of2']) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Badlands dynamite pairing, milestone unlock, collision, and GameSession view match TDM markers', async () => {
  assert.deepEqual(markerCells(102), [[27, 9]]);
  assert.deepEqual(markerCells(110), [[26, 10]]);

  const locked = createDakota04DynamiteDefinition([]);
  assert.deepEqual(locked, {
    unlocked: false,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 27, y: 9 }, boxCell: { x: 26, y: 10 } }],
  });
  const unlockedBy20 = createDakota04DynamiteDefinition([campaignScenarioIdForLevel(20)]);
  const unlockedBy30 = createDakota04DynamiteDefinition([campaignScenarioIdForLevel(30)]);
  assert.equal(unlockedBy20.unlocked, true);
  assert.equal(unlockedBy30.unlocked, true);
  assert.deepEqual(unlockedBy20.pairs, locked.pairs);

  const scene = createDakota04MapScene();
  const lockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, locked);
  const unlockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, unlockedBy20);
  assert.equal(lockedBoxes.some(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), false);
  assert.deepEqual(unlockedBoxes.filter(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), [
    {
      x: (27 * FINE_UNITS_PER_CELL) + 3_840 + PLAYER_UNIT_COLLIDER_FINE.x,
      y: (9 * FINE_UNITS_PER_CELL) + 3_840 + 1_920 + PLAYER_UNIT_COLLIDER_FINE.y,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
      sourceCell: { x: 27, y: 9 },
      sourceTdmCode: 102,
    },
    {
      x: (26 * FINE_UNITS_PER_CELL) + 3_840 + PLAYER_UNIT_COLLIDER_FINE.x,
      y: (10 * FINE_UNITS_PER_CELL) + 3_840 + 1_920 + PLAYER_UNIT_COLLIDER_FINE.y,
      width: PLAYER_UNIT_COLLIDER_FINE.width,
      height: PLAYER_UNIT_COLLIDER_FINE.height,
      sourceCell: { x: 26, y: 10 },
      sourceTdmCode: 110,
    },
  ]);

  for (const asset of ['dynamite_detonator', 'dynamite_detonator_pressed', 'dynamite_box', 'sfx_dynamite_box']) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }

  const scenario: ScenarioContent = {
    id: 'badlands-dynamite-view-test',
    title: { en: 'Badlands dynamite view test', zh: '荒原炸药显示测试' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [],
    dynamite: unlockedBy20,
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.deepEqual(session.observe().dynamites?.map(({ id, triggerCell, boxCell, unlocked }) => [
      id, triggerCell.x, triggerCell.y, boxCell.x, boxCell.y, unlocked,
    ]), [['dynamite-1', 27, 9, 26, 10, true]]);
  } finally {
    session.close();
  }
});
