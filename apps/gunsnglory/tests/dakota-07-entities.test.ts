import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-07.json';
import { createDakota07MapScene } from '../src/content/dakota-07-scene';
import { createDakota07MapUnits } from '../src/content/dakota-07-units';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
} from '../src/content/mississippi-unit-unlocks';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const fineUnitsPerCell = 7_680;
const sceneryExpectations = [
  { marker: 69, asset: 'e_1x1_rocks_snow_a', cells: [[0, 0], [31, 0], [26, 7], [17, 19], [30, 22], [22, 23]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 70, asset: 'e_1x1_rocks_snow_b', cells: [[19, 0], [1, 2], [31, 5], [0, 17], [19, 19], [31, 19], [4, 23]], bounds: { x: 1_306, y: 1_920, width: 5_068, height: 3_840 } },
  { marker: 75, asset: 'b_1x1_watertower', cells: [[9, 0], [16, 6], [14, 14], [14, 22]], bounds: { x: 1_920, y: 2_612, width: 3_840, height: 2_534 } },
  { marker: 86, asset: 'tiles_railway_buffers_hori_left', cells: [[6, 1], [5, 7], [10, 13], [1, 21]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
  { marker: 87, asset: 'tiles_railway_buffers_hori_right', cells: [[26, 1], [21, 7], [29, 13], [25, 21]], bounds: { x: 0, y: 0, width: 7_680, height: 7_680 } },
] as const;

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

function createScenario(units: readonly ScenarioUnit[]): ScenarioContent {
  return {
    id: 'frost-station-collision-probe',
    title: { en: 'Frost Station collision probe', zh: 'Frost Station 碰撞探针' },
    map: createDakota07MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...units],
  };
}

async function moveProbe(
  start: { x: number; y: number },
  target: { x: number; y: number },
  obstacles: readonly ScenarioUnit[] = [],
) {
  const player = createActiveGunslinger(start, 907);
  const scenario = createScenario([player, ...obstacles]);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: start.x + 0.5, y: start.y + 0.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: target.x, targetY: target.y }), true);
    let view = session.observe();
    for (let frame = 0; frame < 50; frame += 1) view = session.advance({ deltaMs: 100 });
    return { player, view };
  } finally {
    session.close();
  }
}

test('Frost Station scenery and buffers map every TDM marker to the APK asset and collision bounds', () => {
  const scene = createDakota07MapScene();
  const decorations = scene.decorations ?? [];
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, decorations, undefined);

  for (const expected of sceneryExpectations) {
    assert.deepEqual(markerCells(expected.marker), expected.cells, `raw ${expected.marker} cells`);
    const actual = decorations.filter(({ asset }) => asset === expected.asset);
    assert.deepEqual(actual.map(({ cell }) => [cell.x, cell.y]), expected.cells, `raw ${expected.marker} scene mapping`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(expected.asset))), `${expected.asset} is bundled`);
    for (const [x, y] of expected.cells) {
      assert.deepEqual(
        collisions.filter(({ sourceTdmCode, sourceCell }) => sourceTdmCode === expected.marker
          && sourceCell?.x === x && sourceCell.y === y),
        [{
          x: x * fineUnitsPerCell + expected.bounds.x,
          y: y * fineUnitsPerCell + expected.bounds.y,
          width: expected.bounds.width,
          height: expected.bounds.height,
          sourceCell: { x, y },
          sourceTdmCode: expected.marker,
        }],
        `raw ${expected.marker} at (${x}, ${y}) has the independently audited APK collision box`,
      );
    }
  }
  assert.equal(decorations.length, 25);
  assert.equal(decorations.some(({ asset }) => asset.startsWith('lok_')), false, 'trains are moving units, not static scenery');
});

test('Frost Station sleeping hires and special units follow the original unlock gates and TDM cells', () => {
  const locked = createDakota07MapUnits();
  const allUnlocked = createDakota07MapUnits(completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true, sniper: true, pyromaniac: true, salesman: true,
  }));
  const sleepingExpectations = [
    { marker: 96, type: 'gunslinger', count: 15 },
    { marker: 97, type: 'mexican', count: 11 },
    { marker: 98, type: 'cannon', count: 7 },
    { marker: 99, type: 'indian', count: 6 },
    { marker: 100, type: 'sniper', count: 1 },
    { marker: 101, type: 'grandpa', count: 7 },
  ] as const;

  for (const expected of sleepingExpectations) {
    const cells = markerCells(expected.marker);
    const units = allUnlocked.filter(({ type, activity }) => type === expected.type && activity === 4);
    assert.equal(cells.length, expected.count, `raw ${expected.marker} count`);
    assert.deepEqual(units.map(({ cell }) => [cell.x, cell.y]), cells, `raw ${expected.marker} unit cells`);
  }
  for (const { marker, type } of sleepingExpectations.slice(0, 4)) {
    assert.deepEqual(locked.filter(({ activity, type: unitType }) => activity === 4 && unitType === type)
      .map(({ cell }) => [cell.x, cell.y]), markerCells(marker), `always available ${type} hire markers`);
  }
  for (const { marker, type } of sleepingExpectations.slice(4)) {
    assert.equal(locked.some(({ activity, type: unitType }) => activity === 4 && unitType === type), false,
      `locked ${type} units are omitted`);
    assert.deepEqual(allUnlocked.filter(({ activity, type: unitType }) => activity === 4 && unitType === type)
      .map(({ cell }) => [cell.x, cell.y]), markerCells(marker));
  }
  assert.deepEqual(allUnlocked.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
    .map(({ type, cell, activity }) => [type, activity, cell.x, cell.y]), [
    ['salesman', 4, 28, 1],
    ['pyromaniac', 4, 0, 19],
  ]);
  assert.equal(locked.some(({ type }) => type === 'pyromaniac' || type === 'salesman'), false);
  const hireIds = allUnlocked.filter(({ activity }) => activity === 4).map(({ id }) => id);
  assert.equal(new Set(hireIds).size, hireIds.length, 'TDM hire markers create unique unit IDs');
});

test('Frost Station sleeping Gunslinger and Mexican units block player movement', async () => {
  const unlocked = createDakota07MapUnits(completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true, sniper: true, pyromaniac: true, salesman: true,
  }));
  const cases = [
    { type: 'gunslinger', cell: { x: 24, y: 8 }, start: { x: 21, y: 8 }, target: { x: 27, y: 8.75 } },
    { type: 'mexican', cell: { x: 17, y: 8 }, start: { x: 14, y: 8 }, target: { x: 20, y: 8.75 } },
  ] as const;

  for (const obstacleCase of cases) {
    const obstacle = unlocked.find(({ type, activity, cell }) => type === obstacleCase.type
      && activity === 4 && cell.x === obstacleCase.cell.x && cell.y === obstacleCase.cell.y);
    assert.ok(obstacle, `${obstacleCase.type} hire marker exists in the fresh-game map`);
    const { player, view } = await moveProbe(obstacleCase.start, obstacleCase.target, [obstacle]);
    const moved = view.units.find(({ id }) => id === player.id);
    const sleepingUnit = view.units.find(({ id }) => id === obstacle.id);
    assert.ok(moved && sleepingUnit);
    const playerRight = moved.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
    const obstacleLeft = sleepingUnit.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x;
    assert.ok(playerRight <= obstacleLeft,
      `${obstacleCase.type} remains a collider while asleep: ${JSON.stringify({ playerRight, obstacleLeft, moved: moved.positionFine })}`);
  }
});
