import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame } from '../src/bootstrap/browser';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type ScenarioContent } from '../src/game';
import {
  apkCollisionBlocksX,
  apkCollisionBlocksY,
  createPlayerMapCollisionBoxes,
  PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE,
  PLAYER_UNIT_COLLIDER_FINE,
} from '../src/game/player-collision-geometry';

const FINE_PER_CELL = 7_680;
const PLAYER_COLLIDER_LEFT = -2_534;

function emptyGrid(width: number, height: number): number[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
}

function movementScenario(
  id: string,
  grid: number[][],
  options: Pick<ScenarioContent['map'], 'decorations'> = {},
): ScenarioContent {
  return {
    id,
    title: { en: 'Collision fixture', zh: '碰撞夹具' },
    map: {
      width: grid[0]?.length ?? 0,
      height: grid.length,
      tileSize: 32,
      background: [],
      streets: [],
      ...options,
    },
    originalTileGrid: grid,
    units: [],
  };
}

test('an activity-4 sleeping player unit blocks another unit using the APK unit collider', async () => {
  const grid = emptyGrid(7, 5);
  const active = createActiveGunslinger({ x: 1, y: 2 }, 1);
  const sleeping = {
    ...createActiveGunslinger({ x: 3, y: 2 }, 2),
    activity: 4 as const,
    asset: 'player_gunslinger_sleep',
  };
  const scenario: ScenarioContent = {
    ...movementScenario('sleeping-unit-collision', grid),
    units: [active, sleeping],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  assert.equal(session.submitIntent({ type: 'select-at', x: 1.5, y: 2.5 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 5.5, targetY: 2.75 }), true);

  let view = session.observe();
  for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });

  const movingUnit = view.units.find(({ id }) => id === active.id);
  const sleepingUnit = view.units.find(({ id }) => id === sleeping.id);
  assert.ok(movingUnit && sleepingUnit);
  const movingRight = movingUnit.positionFine.x - PLAYER_COLLIDER_LEFT;
  const sleepingLeft = sleepingUnit.positionFine.x + PLAYER_COLLIDER_LEFT;
  assert.ok(movingRight <= sleepingLeft,
    'activity 4 changes the sleeping sprite but leaves its cmUnits collision object registered');
});

test('a saloon marker blocks movement even when its decoration has no hand-authored collision box', async () => {
  const grid = emptyGrid(8, 5);
  grid[2]![3] = 112;
  const active = createActiveGunslinger({ x: 1, y: 2 });
  const scenario: ScenarioContent = {
    ...movementScenario('saloon-marker-collision', grid, {
      decorations: [{ asset: 'b_3x2_saloon', cell: { x: 3, y: 2 } }],
    }),
    units: [active],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  assert.equal(session.submitIntent({ type: 'select-at', x: 1.5, y: 2.5 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 6.5, targetY: 2.75 }), true);

  let view = session.observe();
  for (let frame = 0; frame < 35; frame += 1) view = session.advance({ deltaMs: 100 });

  const movingUnit = view.units.find(({ id }) => id === active.id);
  assert.ok(movingUnit);
  const movingRight = movingUnit.positionFine.x - PLAYER_COLLIDER_LEFT;
  const saloonLeft = (3 * FINE_PER_CELL) - 2_496;
  assert.ok(movingRight < saloonLeft,
    'TDM code 112 creates a GameObjectSpawnLocation with its own large cmUnits collision box');
});

test('static object bounds match APK constructors and ignore misleading content offsets', () => {
  const expectedByCode: Readonly<Record<number, { x: number; y: number; width: number; height: number }>> = {
    68: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    69: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    70: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 },
    71: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    72: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    73: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    74: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    75: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    76: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    77: { x: 0, y: -5_760, width: 7_680, height: 11_520 },
    79: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    86: { x: 0, y: 0, width: 7_680, height: 7_680 },
    87: { x: 0, y: 0, width: 7_680, height: 7_680 },
    94: { x: 0, y: 0, width: 7_680, height: 7_680 },
    95: { x: 0, y: 0, width: 7_680, height: 7_680 },
    112: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 },
    113: { x: -5_568, y: -5_760, width: 18_048, height: 7_680 },
    114: { x: -5_184, y: -2_304, width: 10_368, height: 4_224 },
    116: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 },
    117: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
    126: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  };

  assert.deepEqual(Object.keys(PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE).map(Number).sort((a, b) => a - b),
    Object.keys(expectedByCode).map(Number).sort((a, b) => a - b));
  for (const [rawCode, expected] of Object.entries(expectedByCode)) {
    const code = Number(rawCode);
    assert.deepEqual(PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[code], expected, `raw TDM ${code}`);
  }

  const grid = emptyGrid(3, 3);
  grid[1]![1] = 76;
  const boxes = createPlayerMapCollisionBoxes(grid, [{
    asset: 'e_1x1_bush',
    cell: { x: 1, y: 1 },
    collisionBoxFine: { x: 1_920, y: -1_228, width: 3_840, height: 2_534 },
  }], undefined);
  assert.deepEqual(boxes, [{
    x: FINE_PER_CELL + 1_920,
    y: FINE_PER_CELL + 2_612,
    width: 3_840,
    height: 2_534,
    sourceCell: { x: 1, y: 1 },
    sourceTdmCode: 76,
  }], 'the APK TDM object box wins over stale authored collision offsets');

  const markerGrid = emptyGrid(3, 3);
  markerGrid[1]![1] = 78;
  const ignoredMarkerBox = createPlayerMapCollisionBoxes(markerGrid, [{
    asset: 'uninstantiated-marker-test',
    cell: { x: 1, y: 1 },
    collisionBoxFine: { x: 0, y: 0, width: FINE_PER_CELL, height: FINE_PER_CELL },
  }], undefined);
  assert.deepEqual(ignoredMarkerBox, [], 'TDM marker 78 remains non-colliding even if stale content supplies a box');

  const waterGrid = emptyGrid(3, 3);
  waterGrid[1]![1] = 124;
  const waterRockBox = createPlayerMapCollisionBoxes(waterGrid, [{
    asset: 'e_1x1_rocks_water',
    cell: { x: 1, y: 1 },
    collisionBoxFine: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  }], undefined);
  assert.equal(waterRockBox.length, 1, 'custom water-rock geometry on ordinary terrain remains collidable');
});

test('horizontal and vertical collision checks use APK edge-crossing semantics', () => {
  const mover = { x: 0, y: 2, width: 2, height: 2 };
  const wall = { x: 4, y: 1, width: 2, height: 4 };
  assert.equal(apkCollisionBlocksX(mover, wall, 1), false, 'a step that does not reach the wall is clear');
  assert.equal(apkCollisionBlocksX(mover, wall, 2), true, 'touching the wall edge is blocking');
  assert.equal(apkCollisionBlocksX({ ...mover, x: 3 }, wall, 0), false,
    'a unit already overlapping an object is not treated as a new edge crossing');
  assert.equal(apkCollisionBlocksY({ ...mover, x: 4, y: -2 }, wall, 0.5), false,
    'vertical movement outside the wall footprint is clear');
  assert.equal(apkCollisionBlocksY({ ...mover, x: 4, y: -2 }, wall, 2), true,
    'vertical movement across the wall edge is blocked');
  assert.deepEqual(PLAYER_UNIT_COLLIDER_FINE, { x: -2_534, y: -5_376, width: 5_068, height: 4_608 });
});

test('each official map creates collision boxes for every APK static TDM object marker', async () => {
  const game = createBrowserGame(officialCampaignStages.map(({ scenarioId }) => scenarioId));
  const staticCodes = Object.keys(PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE).map(Number);
  for (const stage of officialCampaignStages) {
    const session = await game.open({ scenarioId: stage.scenarioId, mode: 'free', randomSeed: 1 });
    const map = session.observe().map;
    const grid = map.originalTileGrid;
    assert.ok(grid, `level ${stage.globalLevel} has its source TDM grid`);
    const boxes = createPlayerMapCollisionBoxes(grid, map.decorations ?? [], undefined);
    for (const code of staticCodes) {
      for (let y = 0; y < grid.length; y += 1) {
        for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
          if (grid[y]?.[x] !== code) continue;
          const matchingBoxes: ReturnType<typeof createPlayerMapCollisionBoxes> = boxes.filter((box) => box.sourceTdmCode === code
            && box.sourceCell?.x === x && box.sourceCell.y === y);
          assert.equal(matchingBoxes.length, 1,
            `level ${stage.globalLevel} raw TDM ${code} at (${x},${y}) creates exactly one APK collision object`);
          const relative: Readonly<{ x: number; y: number; width: number; height: number }> = PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[code]!;
          assert.deepEqual(matchingBoxes[0], {
            x: x * FINE_PER_CELL + relative.x,
            y: y * FINE_PER_CELL + relative.y,
            width: relative.width,
            height: relative.height,
            sourceCell: { x, y },
            sourceTdmCode: code,
          });
        }
      }
    }
    for (const omittedCode of [78, 115, 118, 119, 80, 88, 89]) {
      assert.equal(boxes.some((box) => box.sourceTdmCode === omittedCode), false,
        `level ${stage.globalLevel} raw TDM ${omittedCode} is not misclassified as static scenery`);
    }
    session.close();
  }
});

test('only unlocked dynamite objects join the blocking map object list', () => {
  const grid = emptyGrid(4, 4);
  grid[1]![1] = 102;
  grid[2]![2] = 110;
  const pairs = [{ triggerCell: { x: 1, y: 1 }, boxCell: { x: 2, y: 2 } }];
  assert.equal(createPlayerMapCollisionBoxes(grid, [], { unlocked: false, pairs }).length, 0);
  const boxes = createPlayerMapCollisionBoxes(grid, [], { unlocked: true, pairs });
  assert.deepEqual(boxes.map(({ x, y, width, height, sourceTdmCode }) => ({ x, y, width, height, sourceTdmCode })), [
    { x: 1 * FINE_PER_CELL + 1_306, y: 1 * FINE_PER_CELL + 384, width: 5_068, height: 4_608, sourceTdmCode: 102 },
    { x: 2 * FINE_PER_CELL + 1_306, y: 2 * FINE_PER_CELL + 384, width: 5_068, height: 4_608, sourceTdmCode: 110 },
  ]);
});

test('a raw-150 casino creates a blocker only when the APK actually instantiates it', () => {
  const grid = emptyGrid(3, 3);
  grid[1]![1] = 150;
  assert.deepEqual(createPlayerMapCollisionBoxes(grid, [], undefined), []);
  const boxes = createPlayerMapCollisionBoxes(grid, [{
    asset: 'b_3x2_casino',
    cell: { x: 1, y: 1 },
  }], undefined);
  assert.deepEqual(boxes, [{
    x: FINE_PER_CELL - 2_496,
    y: FINE_PER_CELL - 4_224,
    width: 14_592,
    height: 6_144,
    sourceCell: { x: 1, y: 1 },
    sourceTdmCode: 150,
  }]);
});

test('activity-4 recruits and their active replacements remain physical blockers', async () => {
  const grid = emptyGrid(7, 5);
  const mover = createActiveGunslinger({ x: 1, y: 2 }, 1);
  const blockingUnit = {
    ...createActiveGunslinger({ x: 3, y: 2 }, 2),
    activity: 2 as const,
  };
  const scenario = { ...movementScenario('active-unit-collision', grid), units: [mover, blockingUnit] };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  assert.equal(session.submitIntent({ type: 'select-at', x: 1.5, y: 2.5 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 5.5, targetY: 2.75 }), true);
  let view = session.observe();
  for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });
  const unit = view.units.find(({ id }) => id === mover.id);
  assert.ok(unit);
  assert.ok(unit.positionFine.x + PLAYER_COLLIDER_LEFT + 5_068
    <= blockingUnit.cell.x * FINE_PER_CELL + (FINE_PER_CELL / 2) + PLAYER_COLLIDER_LEFT,
    'an active unit remains a blocking collision object just like an unrecruited map unit');
});

test('a vertical raw-88 bridge stays within the source TDM crossing width', async () => {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 5 }, () => 32));
  for (let y = 2; y <= 4; y += 1) grid[y]![2] = 88;
  const unit = { ...createActiveGunslinger({ x: 2, y: 3 }), movementSpeedFinePer100Ms: 500 };
  const scenario: ScenarioContent = {
    ...movementScenario('vertical-bridge-collision', grid),
    units: [unit],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  assert.equal(session.submitIntent({ type: 'select-at', x: 2.5, y: 3.5 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 2.5, targetY: 1.5 }), true);
  let view = session.observe();
  for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });
  const moved = view.units[0]!;
  assert.ok(moved.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y >= 2 * FINE_PER_CELL,
    'the APK player box cannot leave the vertical TDM bridge through the northern raw-32 bank');
  assert.ok(moved.positionFine.y / FINE_PER_CELL < 2.8, 'the unit can traverse the bridge itself');
});

test('an APK Fort spawn can appear inside its building and move out through the overlapping edge', async () => {
  const grid = emptyGrid(8, 7);
  grid[3]![3] = 113;
  const cannon = {
    ...createActiveGunslinger({ x: 3, y: 3 }, 1),
    id: 'fort-spawned-cannon',
    cell: { x: 3, y: 3 },
    activity: 2 as const,
  };
  const scenario: ScenarioContent = {
    ...movementScenario('fort-exit-collision', grid, {
      decorations: [{ asset: 'b_3x2_fort', cell: { x: 3, y: 3 } }],
    }),
    units: [cannon],
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  assert.equal(session.submitIntent({ type: 'select-at', x: 3.5, y: 3.5 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 3.5, targetY: 6 }), true);
  let view = session.observe();
  for (let frame = 0; frame < 10; frame += 1) view = session.advance({ deltaMs: 100 });
  assert.ok(view.units[0]!.positionFine.y > cannon.cell.y * FINE_PER_CELL + 5_760,
    'edge-crossing tests allow an intentionally overlapping Fort spawn to leave the building');
});
