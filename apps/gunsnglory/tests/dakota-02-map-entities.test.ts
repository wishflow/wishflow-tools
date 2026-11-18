import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-02.json';
import { createDakota02MapScene } from '../src/content/dakota-02-scene';
import { createDakota02MapUnits } from '../src/content/dakota-02-units';
import { dakota02CampaignUnitPool } from '../src/content/dakota-02-unit-pool';
import { mississippiUnitUnlockSnapshotFor, completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_PER_CELL = 7_680;

const sceneryExpectations = [
  { marker: 69, asset: 'e_1x1_rocks_a', cells: [[9, 1], [25, 1], [23, 4], [29, 13], [23, 14], [29, 22]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 70, asset: 'e_1x1_rocks_b', cells: [[21, 1], [26, 12]], bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 } },
  { marker: 71, asset: 'e_1x1_tree', cells: [[17, 0], [30, 0], [2, 7], [2, 19], [30, 20]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 72, asset: 'b_1x1_stake', cells: [[12, 13]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 75, asset: 'b_1x1_watertower', cells: [[8, 22]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 76, asset: 'e_1x1_bush', cells: [[8, 4], [31, 5], [0, 6], [22, 7], [17, 11], [30, 11], [2, 17], [5, 19], [20, 23]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 86, asset: 'tiles_railway_buffers_hori_left', cells: [[1, 21]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
  { marker: 87, asset: 'tiles_railway_buffers_hori_right', cells: [[20, 21]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
  { marker: 112, asset: 'b_3x2_saloon', cells: [[29, 3]], bounds: { x: -2_496, y: -4_224, width: 14_592, height: 6_144 } },
  { marker: 114, asset: 'b_2x1_tipi', cells: [[12, 10]], bounds: { x: -5_184, y: -2_304, width: 10_368, height: 4_224 } },
  { marker: 117, asset: 'b_1x1_tipi_small', cells: [[9, 12], [15, 12], [14, 14], [12, 15]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 126, asset: 'e_1x1_rocks_water', cells: [[1, 1]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

async function moveProbe(
  start: { x: number; y: number },
  target: { x: number; y: number },
  obstacles: readonly ScenarioUnit[] = [],
) {
  const scene = createDakota02MapScene();
  const player = createActiveGunslinger(start, 91);
  const id = `dakota-02-collision-probe-${start.x}-${start.y}-${target.x}-${target.y}`;
  const scenario: ScenarioContent = {
    id,
    title: { en: 'Six Grandfathers collision probe', zh: '六祖父山碰撞探针' },
    map: scene,
    originalTileGrid: map.originalTileGrid,
    units: [player, ...obstacles],
  };
  const session = await createGame({ scenarios: { [id]: scenario } }).open({ scenarioId: id });
  assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y }), true);
  let view = session.observe();
  for (let frame = 0; frame < 40; frame += 1) view = session.advance({ deltaMs: 100 });
  session.close();
  return { player, view };
}

test('Six Grandfathers static TDM markers map to APK scenery, locations, assets and collision bounds', () => {
  const scene = createDakota02MapScene();
  const decorations = scene.decorations ?? [];
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, decorations, undefined);

  for (const expected of sceneryExpectations) {
    assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} source cells`);
    const actual = decorations.filter(({ asset }) => asset === expected.asset);
    assert.deepEqual(actual.map(({ cell }) => [cell.x, cell.y]), expected.cells, `raw ${expected.marker} render mapping`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))), `${expected.asset} exists`);
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
        `raw ${expected.marker} at (${x},${y}) has the independently audited APK collision box`,
      );
    }
  }

  assert.equal(decorations.length, 33);
  assert.equal(decorations.find(({ asset }) => asset === 'b_3x2_saloon')?.anchorOffsetY, -0.3);
  assert.deepEqual({
    anchorOffsetX: decorations.find(({ asset }) => asset === 'b_2x1_tipi')?.anchorOffsetX,
    anchorOffsetY: decorations.find(({ asset }) => asset === 'b_2x1_tipi')?.anchorOffsetY,
  }, { anchorOffsetX: -0.5, anchorOffsetY: -0.3 });
  assert.equal(map.originalTileGrid.flat().filter((code) => code === 80).length, 1);
  assert.equal(map.originalTileGrid.flat().filter((code) => code === 88).length, 4);
});

test('Six Grandfathers fresh-game units preserve the APK hire markers and unlock gates', () => {
  const lockedUnits = createDakota02MapUnits();
  const unlockedSnapshot = {
    grandpa: true,
    sniper: true,
    pyromaniac: true,
    salesman: true,
  };
  const allUnlocks = completedScenarioIdsForMississippiUnitUnlockSnapshot(unlockedSnapshot);
  assert.deepEqual(mississippiUnitUnlockSnapshotFor(allUnlocks), unlockedSnapshot);
  const unlockedUnits = createDakota02MapUnits(allUnlocks);

  const expectedSleepers = [
    { marker: 96, type: 'gunslinger', count: 14 },
    { marker: 97, type: 'mexican', count: 11 },
    { marker: 98, type: 'cannon', count: 8 },
    { marker: 99, type: 'indian', count: 6 },
    { marker: 100, type: 'sniper', count: 1 },
    { marker: 101, type: 'grandpa', count: 6 },
  ] as const;

  for (const { marker, type, count } of expectedSleepers) {
    const cells = markerCells(marker);
    const actual = unlockedUnits.filter((unit) => unit.type === type && unit.activity === 4);
    assert.equal(cells.length, count, `raw ${marker} marker count`);
    assert.deepEqual(actual.map(({ cell }) => [cell.x, cell.y]), cells, `raw ${marker} sleeping units`);
  }

  for (const { marker, type } of expectedSleepers.slice(0, 4)) {
    assert.deepEqual(lockedUnits.filter((unit) => unit.type === type && unit.activity === 4).map(({ cell }) => [cell.x, cell.y]), markerCells(marker),
      `unlocked standard pool unit ${type} remains visible as sleeping hire`);
  }
  for (const { marker, type } of expectedSleepers.slice(4)) {
    assert.equal(lockedUnits.some((unit) => unit.type === type && unit.activity === 4), false,
      `locked ${type} marker is not instantiated`);
  }

  assert.deepEqual(markerCells(109), [], 'map35 has no activity-5 Grandpa marker');
  assert.equal(lockedUnits.some(({ type, activity }) => type === 'grandpa' && activity === 5), false);
  assert.equal(unlockedUnits.some(({ type, activity }) => type === 'grandpa' && activity === 5), false,
    'the map must not synthesize an active Grandpa absent from its APK TDM');
  assert.equal(lockedUnits.some(({ type }) => type === 'pyromaniac' || type === 'salesman'), false,
    'locked special units are not instantiated before their unlock milestones');
  assert.deepEqual(unlockedUnits.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).map(({ cell }) => [cell.x, cell.y]), [[13, 23]]);
  assert.deepEqual(unlockedUnits.filter(({ type, activity }) => type === 'salesman' && activity === 4).map(({ cell }) => [cell.x, cell.y]), [[27, 6]]);

  const sleepingIds = lockedUnits.filter(({ activity }) => activity === 4).map(({ id }) => id);
  assert.equal(new Set(sleepingIds).size, sleepingIds.length, 'every hire marker has a unique ID');
});

test('Six Grandfathers treats raw 82 as track and creates one two-engine, four-wagon train', () => {
  const units = createDakota02MapUnits();
  const train = units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-02-train-'));

  assert.deepEqual(train.map(({ type, activity, cell, asset }) => [type, activity, cell.x, cell.y, asset]), [
    ['train-10', 5, 10, 21, 'lok_hori_1of2'],
    ['train-11', 5, 11, 21, 'lok_hori_2of2'],
    ['train-12', 4, 12, 21, 'lok_wagon_hori'],
    ['train-12', 4, 13, 21, 'lok_wagon_hori'],
    ['train-12', 4, 14, 21, 'lok_wagon_hori'],
    ['train-12', 4, 15, 21, 'lok_wagon_hori'],
  ]);
  assert.equal(new Set(train.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(train.every(({ collisionBoxFine }) => collisionBoxFine !== undefined), 'all train pieces carry their own collision geometry');
  assert.deepEqual(markerCells(82), [[2, 21], [3, 21], [4, 21], [5, 21], [6, 21], [7, 21], [8, 21], [9, 21], [16, 21], [17, 21], [18, 21], [19, 21]]);
  assert.deepEqual(markerCells(83), [[10, 21], [11, 21]]);
  assert.deepEqual(markerCells(84), [[12, 21], [13, 21], [14, 21], [15, 21]]);
});

test('Six Grandfathers pool types and source buildings match Saloon and Tipi markers', () => {
  const pool = dakota02CampaignUnitPool;
  assert.deepEqual(pool.spawnLocations.map(({ id, spawnLocationType, cell }) => [id, spawnLocationType, cell.x, cell.y]), [
    ['saloon', 1, 29, 3],
    ['tipi', 3, 12, 10],
  ]);
  assert.deepEqual(pool.units.map(({ poolType, unitType, spawnLocationType }) => [poolType, unitType, spawnLocationType]), [
    [1, 'gunslinger', 1],
    [2, 'mexican', 1],
    [4, 'indian', 3],
  ]);
  assert.deepEqual(pool.actions, [
    { action: 'set', waveNumber: 1, values: [{ poolType: 1, count: 0 }, { poolType: 2, count: 0 }, { poolType: 4, count: 0 }] },
    { action: 'set-max', waveNumber: 1, values: [{ poolType: 1, count: 3 }, { poolType: 2, count: 3 }, { poolType: 4, count: 3 }] },
  ]);
  assert.equal(pool.units.some(({ unitType }) => unitType === 'cannon'), false,
    'the zero-cap Cannon pool has no Fort source marker and is not synthesized');
  assert.equal(pool.intervalMs, 15_000, 'the web default cadence is explicit and not an APK claim');
});

test('Six Grandfathers buildings, terrain objects, sleeping hires and train block real player movement', async () => {
  const scene = createDakota02MapScene();
  const staticCases = [
    { marker: 112, cell: { x: 29, y: 3 }, start: { x: 27, y: 3 }, target: { x: 31, y: 3.75 } },
    { marker: 114, cell: { x: 12, y: 10 }, start: { x: 9, y: 10 }, target: { x: 15, y: 10.75 } },
    { marker: 70, cell: { x: 21, y: 1 }, start: { x: 19, y: 1 }, target: { x: 23, y: 1.75 } },
  ] as const;

  for (const obstacle of staticCases) {
    const { player, view } = await moveProbe(obstacle.start, obstacle.target);
    const moved = view.units.find(({ id }) => id === player.id);
    const collision = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations, undefined)
      .find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === obstacle.marker
        && sourceCell?.x === obstacle.cell.x && sourceCell.y === obstacle.cell.y);
    assert.ok(moved && collision, `raw ${obstacle.marker} has a moving unit and an audited blocker`);
    assert.ok(moved.positionFine.x + (PLAYER_UNIT_COLLIDER_FINE.width / 2) <= collision.x,
      `raw ${obstacle.marker} at (${obstacle.cell.x},${obstacle.cell.y}) blocks the actual GameSession movement`);
  }

  const unlocks = completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true, sniper: true, pyromaniac: true, salesman: true,
  });
  const sleepingHire = createDakota02MapUnits(unlocks)
    .find(({ type, cell }) => type === 'gunslinger' && cell.x === 17 && cell.y === 1);
  assert.ok(sleepingHire && sleepingHire.activity === 4);
  const sleepingProbe = await moveProbe({ x: 15, y: 1 }, { x: 19, y: 1.75 }, [sleepingHire]);
  const sleepingPlayer = sleepingProbe.view.units.find(({ id }) => id === sleepingProbe.player.id);
  assert.ok(sleepingPlayer && sleepingPlayer.positionFine.x < (17 * FINE_PER_CELL),
    'an un-hired activity-4 Gunslinger remains a dynamic movement blocker');

  const train = createDakota02MapUnits().filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-02-train-'));
  const trainProbe = await moveProbe({ x: 13, y: 20 }, { x: 13, y: 22.5 }, train);
  const trainPlayer = trainProbe.view.units.find(({ id }) => id === trainProbe.player.id);
  const wagon = trainProbe.view.units.find(({ type, cell }) => type === 'train-12' && cell.x === 13 && cell.y === 21);
  assert.ok(trainPlayer && wagon && wagon.collisionBoxFine);
  const playerBottom = trainPlayer.positionFine.y + PLAYER_UNIT_COLLIDER_FINE.y + PLAYER_UNIT_COLLIDER_FINE.height;
  const trainTop = wagon.positionFine.y + wagon.collisionBoxFine.y;
  assert.ok(playerBottom <= trainTop, 'the player stops at the moving train wagon collision edge');
});

test('Six Grandfathers short GameSession follows bridge orientation and blocks the bridge sides', async () => {
  const horizontal = await moveProbe({ x: 12, y: 2 }, { x: 15, y: 2.75 });
  const horizontalUnit = horizontal.view.units.find(({ id }) => id === horizontal.player.id);
  assert.ok(horizontalUnit && horizontalUnit.positionFine.x > 14.5 * FINE_PER_CELL,
    'the player crosses the raw 80 horizontal bridge along its one-cell corridor');

  const vertical = await moveProbe({ x: 24, y: 8 }, { x: 24, y: 12 });
  const verticalUnit = vertical.view.units.find(({ id }) => id === vertical.player.id);
  assert.ok(verticalUnit && verticalUnit.positionFine.y > 11.5 * FINE_PER_CELL,
    'the player crosses each raw 88 vertical bridge cell along its one-cell corridor');

  const horizontalSide = await moveProbe({ x: 12, y: 1 }, { x: 15, y: 1.75 });
  const horizontalSideUnit = horizontalSide.view.units.find(({ id }) => id === horizontalSide.player.id);
  assert.ok(horizontalSideUnit && horizontalSideUnit.positionFine.x < 13 * FINE_PER_CELL,
    'the player cannot bypass the horizontal bridge through its raw 32 side cell');

  const verticalSide = await moveProbe({ x: 23, y: 8 }, { x: 23, y: 12 });
  const verticalSideUnit = verticalSide.view.units.find(({ id }) => id === verticalSide.player.id);
  assert.ok(verticalSideUnit && verticalSideUnit.positionFine.y < 9 * FINE_PER_CELL,
    'the player cannot leave the vertical bridge through its raw 36 side cell');
});
