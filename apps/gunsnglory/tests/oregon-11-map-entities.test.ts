import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-11.json';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createOregon11Dynamite, createOregon11DynamiteFromUnlock } from '../src/content/oregon-11-dynamite';
import { createOregon11MapContent } from '../src/content/oregon-11-map-entities';
import { createOregon11MapScene } from '../src/content/oregon-11-scene';
import { createGame, type ScenarioContent } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;
const PLAYER_COLLIDER_HALF_WIDTH = 2_534;

const staticObjectExpectations = [
  {
    marker: 69,
    asset: 'e_1x1_rocks_a',
    cells: [[15, 0], [26, 0], [22, 1], [17, 3], [28, 5], [12, 7], [6, 10], [15, 12], [31, 17], [23, 18], [9, 19], [16, 22]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 70,
    asset: 'e_1x1_rocks_b',
    cells: [[6, 3], [27, 7], [12, 14]],
    bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 },
  },
  {
    marker: 71,
    asset: 'e_1x1_tree',
    cells: [[3, 3], [30, 10], [21, 18], [8, 23]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 74,
    asset: 'b_1x1_windmill',
    cells: [[9, 12]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 76,
    asset: 'e_1x1_bush',
    cells: [[30, 0], [8, 3], [1, 4], [29, 8], [29, 12], [1, 13], [26, 23]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
  {
    marker: 112,
    asset: 'b_3x2_saloon',
    cells: [[9, 15]],
    bounds: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 },
  },
  {
    marker: 116,
    asset: 'b_2x1_shack',
    cells: [[30, 6], [3, 15]],
    bounds: { x: -7_680, y: 2_612, width: 15_360, height: 3_840 },
  },
  {
    marker: 126,
    asset: 'e_1x1_rocks_water',
    cells: [[3, 20]],
    bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 },
  },
] as const;

test('Loot Lakes static TDM markers map to the APK scenery, exact coordinates, and bundled assets', () => {
  const scene = createOregon11MapScene();
  const decorations = scene.decorations ?? [];

  for (const expected of staticObjectExpectations) {
    const actual = decorations.filter(({ asset }) => asset === expected.asset);
    assert.deepEqual(
      actual.map(({ cell }) => [cell.x, cell.y]),
      expected.cells,
      `raw TDM ${expected.marker} maps to ${expected.asset}`,
    );
    assert.ok(
      existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))),
      `${expected.asset} is bundled`,
    );
    for (const [x, y] of expected.cells) {
      assert.equal(map.originalTileGrid[y]?.[x], expected.marker, `${expected.asset} is anchored to raw ${expected.marker} at (${x},${y})`);
    }
  }

  assert.equal(decorations.length, 31);
  assert.equal(decorations.find(({ asset }) => asset === 'b_3x2_saloon')?.anchorOffsetY, -0.3);
  assert.equal(decorations.find(({ asset }) => asset === 'b_2x1_shack')?.anchorOffsetX, -0.5);
  assert.equal(decorations.some(({ asset }) => asset === 'b_3x2_casino'), false,
    'raw 150 is only rendered after D2 confirms the Gambler unlock');
});

test('Loot Lakes static collision rectangles match independent APK marker expectations', () => {
  const scene = createOregon11MapScene();
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined);

  for (const expected of staticObjectExpectations) {
    for (const [x, y] of expected.cells) {
      assert.deepEqual(
        collisions.filter(({ sourceTdmCode, sourceCell }) => (
          sourceTdmCode === expected.marker && sourceCell?.x === x && sourceCell.y === y
        )),
        [{
          x: (x * FINE_PER_CELL) + expected.bounds.x,
          y: (y * FINE_PER_CELL) + expected.bounds.y,
          width: expected.bounds.width,
          height: expected.bounds.height,
          sourceCell: { x, y },
          sourceTdmCode: expected.marker,
        }],
        `raw TDM ${expected.marker} at (${x},${y}) creates one APK-sized collision box`,
      );
    }
  }
  assert.equal(collisions.some(({ sourceTdmCode }) => sourceTdmCode === 150), false,
    'the locked Casino does not create a collision object');
});

test('Loot Lakes Saloon, shack, and rocks block real short GameSession movement', async () => {
  const scene = createOregon11MapScene();
  const blockers = [
    { marker: 112, cell: { x: 9, y: 15 }, start: { x: 7, y: 15 } },
    { marker: 116, cell: { x: 3, y: 15 }, start: { x: 1, y: 15 } },
    { marker: 70, cell: { x: 12, y: 14 }, start: { x: 11, y: 14 } },
  ] as const;

  for (const [index, blocker] of blockers.entries()) {
    const unit = createActiveGunslinger(blocker.start, index + 1);
    const scenarioId = `loot-lakes-static-collision-${blocker.marker}`;
    const scenario: ScenarioContent = {
      id: scenarioId,
      title: { en: 'Loot Lakes collision probe', zh: 'Loot Lakes 碰撞探针' },
      map: scene,
      originalTileGrid: map.originalTileGrid,
      units: [unit],
    };
    const session = await createGame({ scenarios: { [scenarioId]: scenario } }).open({ scenarioId });
    assert.equal(session.submitIntent({
      type: 'select-at',
      x: blocker.start.x + 0.5,
      y: blocker.start.y + 0.5,
    }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({
      type: 'move-unit',
      targetX: blocker.cell.x + 2,
      targetY: blocker.start.y + 0.75,
    }), true);

    let view = session.observe();
    for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });

    const moved = view.units.find(({ id }) => id === unit.id);
    const collision = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined)
      .find(({ sourceTdmCode, sourceCell }) => (
        sourceTdmCode === blocker.marker
        && sourceCell?.x === blocker.cell.x
        && sourceCell.y === blocker.cell.y
      ));
    assert.ok(moved && collision, `raw ${blocker.marker} has a moving unit and blocker`);
    assert.ok(moved.positionFine.x + PLAYER_COLLIDER_HALF_WIDTH <= collision.x,
      `raw ${blocker.marker} at (${blocker.cell.x},${blocker.cell.y}) blocks movement at its APK collision edge`);
    session.close();
  }
});

test('Loot Lakes GameSession movement follows raw 80/88 bridges and stops at the raw 36 wall', async () => {
  const scene = createOregon11MapScene();
  const probes = [
    {
      id: 'horizontal-bridge',
      start: { x: 24, y: 15 },
      targetX: 27.5,
      targetY: 15.75,
      assertPosition: (x: number, _y: number) => assert.ok(x > 25.5 * FINE_PER_CELL,
        'the unit crosses the raw 80 horizontal bridge into its eastern road tile'),
    },
    {
      id: 'vertical-bridge',
      start: { x: 13, y: 3 },
      targetX: 13.5,
      targetY: 4.75,
      assertPosition: (_x: number, y: number) => assert.ok(y > 4 * FINE_PER_CELL,
        'the unit crosses the raw 88 vertical bridge into its southern road tile'),
    },
    {
      id: 'cliff-wall',
      start: { x: 14, y: 15 },
      targetX: 18,
      targetY: 15.75,
      assertPosition: (x: number, _y: number) => assert.ok(x + PLAYER_COLLIDER_HALF_WIDTH <= 15 * FINE_PER_CELL,
        'the unit cannot cross the raw 36 cliff wall at (15,15)'),
    },
  ] as const;

  for (const probe of probes) {
    const unit = createActiveGunslinger(probe.start, 90);
    const scenarioId = `loot-lakes-terrain-collision-${probe.id}`;
    const scenario: ScenarioContent = {
      id: scenarioId,
      title: { en: 'Loot Lakes terrain probe', zh: 'Loot Lakes 地形探针' },
      map: scene,
      originalTileGrid: map.originalTileGrid,
      units: [unit],
    };
    const session = await createGame({ scenarios: { [scenarioId]: scenario } }).open({ scenarioId });
    assert.equal(session.submitIntent({
      type: 'select-at',
      x: probe.start.x + 0.5,
      y: probe.start.y + 0.5,
    }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({
      type: 'move-unit',
      targetX: probe.targetX,
      targetY: probe.targetY,
    }), true);

    let view = session.observe();
    for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });
    const moved = view.units.find(({ id }) => id === unit.id);
    assert.ok(moved, `${probe.id} has a moving unit`);
    probe.assertPosition(moved.positionFine.x, moved.positionFine.y);
    session.close();
  }
});

test('Loot Lakes new-game units preserve every APK marker, activity, and unlock gate', () => {
  const level31AvailableTypes = new Set([1, 2, 3, 4, 5, 6]);
  const level31 = createOregon11MapContent((unitTypeId) => level31AvailableTypes.has(unitTypeId));
  const expectedLevel31 = [
    ['gunslinger', [[14, 1], [20, 1], [22, 2], [7, 4], [4, 6], [6, 7], [10, 13], [16, 13], [13, 14], [29, 14], [31, 14], [20, 15], [22, 16], [30, 18], [20, 19]]],
    ['mexican', [[17, 1], [6, 5], [9, 5], [24, 7], [5, 8], [26, 8], [27, 13], [4, 16], [13, 16], [24, 17], [18, 19], [9, 21]]],
    ['cannon', [[24, 9], [6, 14], [22, 14]]],
    ['sniper', [[17, 11]]],
    ['grandpa', [[23, 1], [5, 5], [30, 12]]],
  ] as const;

  for (const [type, cells] of expectedLevel31) {
    const units = level31.units.filter(({ type: actualType, activity }) => actualType === type && activity === 4);
    assert.deepEqual(units.map(({ cell }) => [cell.x, cell.y]), cells, `level-31 unlocks create ${type} at each APK marker`);
    assert.ok(units.every(({ awakeAsset }) => Boolean(awakeAsset)), `${type} hires include their awake state`);
  }
  assert.equal(level31.units.length, 34);
  assert.ok(level31.units.every(({ activity }) => activity === 4), 'level-31 marker units are initially sleeping hires');
  assert.equal(level31.units.some(({ type }) => type === 'indian' || type === 'pyromaniac' || type === 'salesman' || type === 'gambler'), false);
  assert.equal(level31.gambler, undefined);
  assert.equal(level31.scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);
  assert.equal(new Set(level31.units.map(({ id }) => id)).size, level31.units.length);

  const allUnlocked = createOregon11MapContent(() => true);
  const expectedAllUnlocked = [
    ['pyromaniac', [[26, 20]]],
    ['salesman', [[31, 8]]],
    ['gambler', [[27, 11]]],
  ] as const;
  for (const [type, cells] of expectedAllUnlocked) {
    assert.deepEqual(
      allUnlocked.units.filter(({ type: actualType }) => actualType === type).map(({ cell }) => [cell.x, cell.y]),
      cells,
      `unlocked ${type} matches its APK TDM marker`,
    );
  }
  assert.equal(allUnlocked.units.length, 37);
  assert.equal(new Set(allUnlocked.units.map(({ id }) => id)).size, allUnlocked.units.length);
  assert.ok(allUnlocked.units.every(({ type, activity }) => activity === (type === 'gambler' ? 5 : 4)));
  assert.deepEqual(allUnlocked.gambler?.unlockedPrizeUnitTypes, [1, 2, 3, 4, 5, 6, 35, 36]);
  assert.equal(allUnlocked.gambler?.cooldownMs, 299_000);
  assert.equal(Object.keys(allUnlocked.gambler?.prizeTemplates ?? {}).length, 8);
  assert.deepEqual(
    allUnlocked.scene.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').map(({ cell }) => cell),
    [{ x: 28, y: 11 }],
  );
  assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath('b_3x2_casino'))),
    'b_3x2_casino is bundled');
  assert.deepEqual(
    createPlayerMapCollisionBoxes(map.originalTileGrid, allUnlocked.scene.decorations, undefined)
      .filter(({ sourceTdmCode }) => sourceTdmCode === 150),
    [{
      x: (28 * FINE_PER_CELL) - 2_496,
      y: (11 * FINE_PER_CELL) - 4_224,
      width: 14_592,
      height: 6_144,
      sourceCell: { x: 28, y: 11 },
      sourceTdmCode: 150,
    }],
  );

  const pyromaniacOnly = createOregon11MapContent((unitTypeId) => unitTypeId === 35);
  assert.equal(pyromaniacOnly.units.filter(({ type }) => type === 'pyromaniac').length, 1);
  assert.equal(pyromaniacOnly.units.some(({ type }) => type === 'salesman' || type === 'gambler'), false);
  assert.equal(pyromaniacOnly.scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);

  const salesmanOnly = createOregon11MapContent((unitTypeId) => unitTypeId === 36);
  assert.equal(salesmanOnly.units.filter(({ type }) => type === 'salesman').length, 1);
  assert.equal(salesmanOnly.units.some(({ type }) => type === 'pyromaniac' || type === 'gambler'), false);
  assert.equal(salesmanOnly.scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);

  for (const { asset, awakeAsset } of allUnlocked.units) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
    if (awakeAsset) {
      assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(awakeAsset))), `${awakeAsset} is bundled`);
    }
  }
});

test('Loot Lakes Dynamite pairs exact TDM triggers and only adds collision objects after unlock', () => {
  const expectedPairs = [
    { id: 'dynamite-1', triggerCell: { x: 18, y: 4 }, boxCell: { x: 18, y: 6 } },
    { id: 'dynamite-2', triggerCell: { x: 9, y: 7 }, boxCell: { x: 9, y: 9 } },
  ];
  const locked = createOregon11DynamiteFromUnlock(false);
  const unlocked = createOregon11Dynamite(['campaign-oregon-10']);
  assert.equal(locked.unlocked, false);
  assert.equal(unlocked.unlocked, true, 'completing the prior global level-30 stage unlocks Dynamite');
  assert.deepEqual(locked.pairs, expectedPairs);
  assert.deepEqual(unlocked.pairs, expectedPairs);
  for (const asset of ['dynamite_detonator', 'dynamite_box']) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }

  const scene = createOregon11MapScene();
  const lockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, locked);
  const unlockedBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, unlocked);
  assert.equal(lockedBoxes.some(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110), false);
  assert.deepEqual(
    unlockedBoxes.filter(({ sourceTdmCode }) => sourceTdmCode === 102 || sourceTdmCode === 110)
      .map(({ sourceTdmCode, sourceCell }) => [sourceTdmCode, sourceCell?.x, sourceCell?.y]),
    [[102, 18, 4], [110, 18, 6], [102, 9, 7], [110, 9, 9]],
  );
});

test('Loot Lakes sleeping hires and unlocked Dynamite block short real GameSession movement', async () => {
  const content = createOregon11MapContent((unitTypeId) => [1, 2, 3, 4, 5, 6].includes(unitTypeId));
  const sleeping = content.units.find(({ type, activity, cell }) => (
    type === 'gunslinger' && activity === 4 && cell.x === 14 && cell.y === 1
  ));
  assert.ok(sleeping, 'raw 96 at (14,1) creates a sleeping Gunslinger');

  const sleepingMover = createActiveGunslinger({ x: 13, y: 1 }, 90);
  const sleepingScenarioId = 'loot-lakes-sleeping-hire-collision';
  const sleepingScenario: ScenarioContent = {
    id: sleepingScenarioId,
    title: { en: 'Loot Lakes sleeper probe', zh: 'Loot Lakes 睡眠单位探针' },
    map: content.scene,
    originalTileGrid: map.originalTileGrid,
    units: [sleepingMover, sleeping],
  };
  const sleepingSession = await createGame({ scenarios: { [sleepingScenarioId]: sleepingScenario } })
    .open({ scenarioId: sleepingScenarioId });
  assert.equal(sleepingSession.submitIntent({ type: 'select-at', x: 13.5, y: 1.5 }), true);
  sleepingSession.advance({ deltaMs: 0 });
  assert.equal(sleepingSession.submitIntent({ type: 'move-unit', targetX: 16, targetY: 1.75 }), true);
  let sleepingView = sleepingSession.observe();
  for (let frame = 0; frame < 20; frame += 1) sleepingView = sleepingSession.advance({ deltaMs: 100 });
  const movedSleeperProbe = sleepingView.units.find(({ id }) => id === sleepingMover.id);
  const sleepingViewUnit = sleepingView.units.find(({ id }) => id === sleeping.id);
  assert.ok(movedSleeperProbe && sleepingViewUnit);
  assert.ok(
    movedSleeperProbe.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width
      <= sleepingViewUnit.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x,
    'activity-4 sleep state keeps its original unit collision box registered',
  );
  sleepingSession.close();

  for (const unlocked of [false, true]) {
    const dynamite = createOregon11DynamiteFromUnlock(unlocked);
    const unit = createActiveGunslinger({ x: 17, y: 4 }, unlocked ? 92 : 91);
    const scenarioId = `loot-lakes-dynamite-collision-${unlocked ? 'unlocked' : 'locked'}`;
    const scenario: ScenarioContent = {
      id: scenarioId,
      title: { en: 'Loot Lakes Dynamite probe', zh: 'Loot Lakes 炸药探针' },
      map: content.scene,
      originalTileGrid: map.originalTileGrid,
      units: [unit],
      dynamite,
    };
    const session = await createGame({ scenarios: { [scenarioId]: scenario } }).open({ scenarioId });
    assert.equal(session.submitIntent({ type: 'select-at', x: 17.5, y: 4.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 21, targetY: 4.75 }), true);
    let view = session.observe();
    for (let frame = 0; frame < 30; frame += 1) view = session.advance({ deltaMs: 100 });
    const moved = view.units.find(({ id }) => id === unit.id);
    assert.ok(moved);
    if (unlocked) {
      const trigger = createPlayerMapCollisionBoxes(map.originalTileGrid, content.scene.decorations, dynamite)
        .find(({ sourceTdmCode, sourceCell }) => (
          sourceTdmCode === 102 && sourceCell?.x === 18 && sourceCell.y === 4
        ));
      assert.ok(trigger);
      assert.ok(moved.positionFine.x + PLAYER_COLLIDER_HALF_WIDTH <= trigger.x,
        'unlocked raw-102 Dynamite trigger blocks unit movement');
    } else {
      assert.ok(moved.positionFine.x > 19 * FINE_PER_CELL,
        'locked Dynamite does not block movement through its TDM marker; the later cliff does');
    }
    session.close();
  }
});
