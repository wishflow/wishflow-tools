import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createBombingtonMapScene } from '../src/content/bombington-scene';
import { bombingtonSpawnLocations } from '../src/content/bombington-spawn-locations';
import { createBombingtonMapUnitsFromSnapshot } from '../src/content/bombington-units';
import map from '../src/content/nevada-02.json';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import {
  createPlayerMapCollisionBoxes,
  PLAYER_UNIT_COLLIDER_FINE,
} from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;
const stumpCell = { x: 2, y: 8 };

const decorationExpectations = [
  { marker: 69, asset: 'e_1x1_rocks_a', cells: [[14, 0], [26, 0], [9, 1], [18, 6], [30, 6], [30, 13], [31, 18], [1, 22]] },
  { marker: 71, asset: 'e_1x1_tree', cells: [[18, 0], [7, 14], [22, 23]] },
  { marker: 73, asset: 'e_1x1_cactus_b', cells: [[22, 0], [1, 5], [10, 9], [19, 9], [30, 9], [15, 16], [10, 23], [31, 23]] },
  { marker: 74, asset: 'b_1x1_windmill', cells: [[6, 1]] },
  { marker: 75, asset: 'b_1x1_watertower', cells: [[1, 11]] },
  { marker: 76, asset: 'e_1x1_bush', cells: [[30, 1], [8, 10], [25, 23]] },
  { marker: 112, asset: 'b_3x2_saloon', cells: [[29, 21]] },
  { marker: 113, asset: 'b_3x2_fort', cells: [[2, 14]] },
  { marker: 114, asset: 'b_2x1_tipi', cells: [[29, 9]] },
  { marker: 117, asset: 'b_1x1_tipi_small', cells: [[25, 9], [24, 13], [31, 13]] },
  { marker: 118, asset: 'e_1x1_tree_stump', cells: [[1, 1], [2, 8], [4, 14], [11, 14], [16, 21]] },
] as const;

const unitMarkerExpectations = [
  { marker: 96, type: 'gunslinger', cells: [[7, 7], [19, 13], [7, 23]] },
  { marker: 97, type: 'mexican', cells: [[2, 6], [19, 6], [20, 15], [7, 20]] },
  { marker: 98, type: 'cannon', cells: [[4, 10], [4, 13], [3, 16], [7, 17]] },
  { marker: 99, type: 'indian', cells: [[25, 6], [26, 10], [24, 11], [30, 11]] },
  { marker: 100, type: 'sniper', gate: 'sniper', cells: [[27, 21]] },
  { marker: 101, type: 'grandpa', gate: 'grandpa', cells: [[21, 4], [11, 21]] },
  { marker: 130, type: 'pyromaniac', gate: 'pyromaniac', cells: [[25, 1], [15, 9], [7, 10], [11, 17], [24, 18]] },
  { marker: 131, type: 'salesman', gate: 'salesman', cells: [[27, 9]] },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function unitCells(units: readonly ScenarioUnit[], type: string): number[][] {
  return units.filter((unit) => unit.type === type && unit.activity === 4)
    .map(({ cell }) => [cell.x, cell.y]);
}

async function moveOnBombington(options: {
  id: string;
  start: { x: number; y: number };
  target: { x: number; y: number };
  units?: readonly ScenarioUnit[];
}) {
  const player = createActiveGunslinger(options.start, 4200);
  const scenario: ScenarioContent = {
    id: options.id,
    title: { en: 'Bombington collision probe', zh: '炸弹镇碰撞探针' },
    map: createBombingtonMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [player, ...(options.units ?? [])],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: options.start.x + 0.5, y: options.start.y + 0.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: options.target.x, targetY: options.target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < 50; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    return { player, view };
  } finally {
    session.close();
  }
}

test('Bombington static markers map to exact APK decorations, spawn locations, and bundled assets', () => {
  const scene = createBombingtonMapScene();
  for (const expected of decorationExpectations) {
    const actual = (scene.decorations ?? [])
      .filter(({ cell }) => map.originalTileGrid[cell.y]?.[cell.x] === expected.marker)
      .map(({ asset, cell, anchorOffsetX, anchorOffsetY }) => ({
        asset,
        cell: [cell.x, cell.y],
        ...(anchorOffsetX === undefined ? {} : { anchorOffsetX }),
        ...(anchorOffsetY === undefined ? {} : { anchorOffsetY }),
      }));
    assert.deepEqual(actual, expected.cells.map(([x, y]) => ({
      asset: expected.asset,
      cell: [x, y],
      ...(expected.marker >= 112 && expected.marker <= 114
        ? { ...(expected.marker === 114 ? { anchorOffsetX: -0.5 } : {}), anchorOffsetY: -0.3 }
        : {}),
    })), `raw ${expected.marker} decoration and anchor mapping`);
    assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} APK inventory`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))),
      `${expected.asset} is bundled`);
  }

  assert.deepEqual(bombingtonSpawnLocations.map(({ id, spawnLocationType, cell }) => [
    id, spawnLocationType, cell.x, cell.y,
  ]), [
    ['tipi', 3, 29, 9],
    ['fort', 2, 2, 14],
    ['saloon', 1, 29, 21],
  ]);
});

test('Bombington static TDM objects use the APK collision geometry, including tree stumps', () => {
  const scene = createBombingtonMapScene();
  const boxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined);
  const expectedBoundsByMarker: Readonly<Record<number, { x: number; y: number; width: number; height: number }>> = {
    69: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    71: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    73: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    74: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    75: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    76: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    112: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 },
    113: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 },
    114: { x: -5_184, y: -2_304, width: 10_368, height: 4_224 },
    117: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    118: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  };

  for (const [markerText, bounds] of Object.entries(expectedBoundsByMarker)) {
    const marker = Number(markerText);
    for (const [x, y] of markerCells(marker)) {
      const matching = boxes.filter(({ sourceTdmCode, sourceCell }) => (
        sourceTdmCode === marker && sourceCell?.x === x && sourceCell.y === y
      ));
      assert.equal(matching.length, 1, `raw ${marker} at (${x},${y}) contributes one collision box`);
      const [box] = matching;
      assert.deepEqual({
        x: box!.x - (x * FINE_PER_CELL),
        y: box!.y - (y * FINE_PER_CELL),
        width: box!.width,
        height: box!.height,
      }, bounds, `raw ${marker} APK collision rectangle`);
    }
  }
});

test('Bombington sleeping hires follow all four profile unlock gates and preserve their foot anchors', () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const unlocks = {
      grandpa: (mask & 1) !== 0,
      sniper: (mask & 2) !== 0,
      pyromaniac: (mask & 4) !== 0,
      salesman: (mask & 8) !== 0,
    };
    const units = createBombingtonMapUnitsFromSnapshot(unlocks);

    for (const expected of unitMarkerExpectations) {
      const unlocked = !('gate' in expected) || unlocks[expected.gate];
      assert.deepEqual(unitCells(units, expected.type), unlocked ? expected.cells : [],
        `unlock mask ${mask}, raw ${expected.marker} ${expected.type}`);
      assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} APK inventory`);
    }

    assert.ok(units.every(({ activity }) => activity === 4), 'all instantiated TDM hires start asleep');
    assert.ok(units.every(({ hirePrice }) => Number.isSafeInteger(hirePrice) && hirePrice! > 0),
      'every instantiated hire has an APK-backed price');
    const ids = units.map(({ id }) => id);
    assert.equal(new Set(ids).size, ids.length, `unlock mask ${mask} has unique IDs`);

    for (const unit of units) {
      assert.equal(unit.render.y + unit.render.height, unit.cell.y + 0.75, `${unit.id} sleeping foot anchor`);
      if (unit.awakeRender) {
        assert.equal(unit.awakeRender.y + unit.awakeRender.height, unit.cell.y + 0.75, `${unit.id} awake foot anchor`);
      }
      for (const asset of [unit.asset, unit.awakeAsset].filter((value): value is string => Boolean(value))) {
        assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
      }
    }
  }
});

test('Bombington GameSession keeps the raw118 stump and unlocked sleeping hire as movement blockers', async () => {
  const stumpProbe = await moveOnBombington({
    id: 'bombington-stump-blocker',
    start: { x: 0, y: stumpCell.y },
    target: { x: 5, y: stumpCell.y + 0.75 },
  });
  const stumpPlayer = stumpProbe.view.units.find(({ id }) => id === stumpProbe.player.id);
  assert.ok(stumpPlayer);
  const stumpLeft = (stumpCell.x * FINE_PER_CELL) + 1_920;
  const stumpPlayerRight = stumpPlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  assert.ok(stumpPlayer.positionFine.x > FINE_PER_CELL, 'the player reaches open ground before the stump');
  assert.ok(stumpPlayerRight <= stumpLeft,
    `the player stops at the stump’s APK collision edge (${stumpPlayerRight} > ${stumpLeft}; `
      + `position=(${stumpPlayer.positionFine.x},${stumpPlayer.positionFine.y}))`);
  assert.ok(stumpLeft - stumpPlayerRight < 2_000, 'the player reaches the tree-stump boundary');

  const sleepers = createBombingtonMapUnitsFromSnapshot({
    grandpa: true, sniper: true, pyromaniac: false, salesman: false,
  });
  const sleepingGunslinger = sleepers.find(({ type, cell }) => type === 'gunslinger' && cell.x === 7 && cell.y === 7);
  assert.ok(sleepingGunslinger?.activity === 4);
  const hireProbe = await moveOnBombington({
    id: 'bombington-sleeping-hire-blocker',
    start: { x: 5, y: 7 },
    target: { x: 10, y: 7.75 },
    units: sleepers,
  });
  const hirePlayer = hireProbe.view.units.find(({ id }) => id === hireProbe.player.id);
  const sleepingView = hireProbe.view.units.find(({ id }) => id === sleepingGunslinger.id);
  assert.ok(hirePlayer && sleepingView);
  const hirePlayerRight = hirePlayer.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
  const sleepingLeft = sleepingView.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x;
  assert.ok(hirePlayer.positionFine.x > 5 * FINE_PER_CELL,
    `the player crosses the road before the sleeping hire (x=${hirePlayer.positionFine.x})`);
  assert.ok(hirePlayerRight <= sleepingLeft, 'activity 4 remains a physical blocker in Bombington');
  assert.ok(sleepingLeft - hirePlayerRight < 2_000, 'the player reaches the sleeping-hire collision edge');
});
