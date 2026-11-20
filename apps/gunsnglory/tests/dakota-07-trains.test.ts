import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-07.json';
import { createDakota07MapScene } from '../src/content/dakota-07-scene';
import { createDakota07MapUnits } from '../src/content/dakota-07-units';
import { createActiveGunslinger } from '../src/content/new-mexico-unit-entities';
import { createGame, type ScenarioContent, type ScenarioUnit } from '../src/game';
import { createPlayerMapCollisionBoxes, PLAYER_UNIT_COLLIDER_FINE } from '../src/game/player-collision-geometry';

const fineUnitsPerCell = 7_680;
const trainGroupPrefix = 'dakota-07-train-';

function trainUnits<T extends { movementGroupId?: string }>(units: readonly T[]): T[] {
  return units.filter(({ movementGroupId }) => movementGroupId?.startsWith(trainGroupPrefix));
}

function createScenario(units: readonly ScenarioUnit[]): ScenarioContent {
  return {
    id: 'frost-station-train-probe',
    title: { en: 'Frost Station train probe', zh: 'Frost Station 列车探针' },
    map: createDakota07MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...units],
  };
}

async function openScenario(units = createDakota07MapUnits()) {
  const scenario = createScenario(units);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  return { scenario, session };
}

test('Frost Station TDM has four separate two-engine, three-wagon horizontal trains', () => {
  const trains = trainUnits(createDakota07MapUnits());
  const expectedRows = [1, 7, 13, 21];
  assert.equal(trains.length, 20);
  const groups: string[] = [...new Set(trains.map(({ movementGroupId }) => movementGroupId)
    .filter((groupId): groupId is string => groupId !== undefined))];
  assert.deepEqual(groups, expectedRows.map((_, index) => `${trainGroupPrefix}${index + 1}`));

  for (const [index, y] of expectedRows.entries()) {
    const group = trains.filter(({ movementGroupId }) => movementGroupId === groups[index]);
    const tdmEngines = map.originalTileGrid[y]!.flatMap((code, x) => code === 83 ? [x] : []);
    const tdmWagons = map.originalTileGrid[y]!.flatMap((code, x) => code === 84 ? [x] : []);
    assert.equal(tdmEngines.length, 2, `TDM row ${y} has two raw83 engines`);
    assert.equal(tdmWagons.length, 3, `TDM row ${y} has three raw84 wagons`);
    assert.deepEqual(group.map(({ type, activity, cell, asset }) => [type, activity, cell.x, cell.y, asset]), [
      [`train-10`, 5, tdmEngines[0], y, 'lok_hori_1of2'],
      [`train-11`, 5, tdmEngines[1], y, 'lok_hori_2of2'],
      ...tdmWagons.map((x) => ['train-12', 4, x, y, 'lok_wagon_hori']),
    ]);
  }
  assert.equal(new Set(trains.map(({ id }) => id)).size, trains.length, 'all pieces have distinct entity IDs');
  assert.ok(trains.every(({ movementAxis, movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementAxis === 'horizontal' && movementSpeedFinePer100Ms === 3_000 && collisionBoxFine !== undefined
  )));
});

test('Frost Station train moves as a group and preserves spacing until the raw87 end buffer blocks it', async () => {
  const allUnits = createDakota07MapUnits();
  const { scenario, session } = await openScenario(allUnits);
  try {
    const initial = trainUnits(session.observe().units).filter(({ movementGroupId }) => movementGroupId === `${trainGroupPrefix}1`);
    assert.equal(initial.length, 5);
    assert.equal(session.submitIntent({ type: 'select-at', x: 10.5, y: 1.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 30, targetY: 1.5 }), true);

    let view = session.advance({ deltaMs: 100 });
    for (let frame = 0; frame < 100 && trainUnits(view.units).some(({ movementGroupId, moving }) => (
      movementGroupId === `${trainGroupPrefix}1` && moving
    )); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const stopped = trainUnits(view.units).filter(({ movementGroupId }) => movementGroupId === `${trainGroupPrefix}1`);
    const buffer = createPlayerMapCollisionBoxes(map.originalTileGrid, scenario.map.decorations, undefined)
      .find(({ sourceTdmCode, sourceCell }) => sourceTdmCode === 87 && sourceCell?.x === 26 && sourceCell.y === 1);
    assert.ok(buffer, 'raw87 creates the APK horizontal end-buffer collider');
    assert.ok(stopped.every(({ moving }) => !moving), 'the group stops at the original buffer');
    assert.deepEqual(stopped.map(({ positionFine }, index) => positionFine.x - initial[index]!.positionFine.x),
      Array.from({ length: 5 }, () => stopped[0]!.positionFine.x - initial[0]!.positionFine.x),
      'each train piece advances by one shared distance');
    assert.ok(stopped.slice(1).every((unit, index) => unit.positionFine.x - stopped[index]!.positionFine.x === fineUnitsPerCell),
      'one-cell separation remains stable');
    for (const unit of stopped) {
      const box = unit.collisionBoxFine!;
      assert.ok(unit.positionFine.x + box.x + box.width <= buffer.x, `${unit.id} stops before the buffer collider`);
    }
    assert.ok(stopped[0]!.positionFine.x > initial[0]!.positionFine.x, 'the train can travel along its track before stopping');
  } finally {
    session.close();
  }
});

test('Frost Station player crosses a raw82 railway image overlay on open base terrain', async () => {
  const player = createActiveGunslinger({ x: 14, y: 7 }, 918);
  const { session } = await openScenario([player]);
  try {
    assert.deepEqual([map.originalTileGrid[7]?.[14], map.originalTileGrid[7]?.[19]], [82, 82],
      'the movement probe spans two raw82 railway image cells');
    assert.ok(createDakota07MapScene().streets?.some(({ x, y, asset }) => x === 14 && y === 7 && asset === 'tiles_railway_hori'));
    assert.equal(createDakota07MapScene().backgroundCollisionCodes?.[7]?.[14], 27,
      'the railway is drawn over its original walkable desert background code');
    assert.equal(session.submitIntent({ type: 'select-at', x: 14.5, y: 7.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 19, targetY: 7.75 }), true);
    let view = session.observe();
    for (let frame = 0; frame < 60; frame += 1) view = session.advance({ deltaMs: 100 });
    const moved = view.units.find(({ id }) => id === player.id);
    assert.ok(moved && moved.positionFine.x > 18.5 * fineUnitsPerCell,
      'the player crosses raw82 railway sprites because they are an image overlay on walkable base terrain');
  } finally {
    session.close();
  }
});

test('Frost Station player stops at the TDM train collider', async () => {
  const player = createActiveGunslinger({ x: 3, y: 1 }, 919);
  const allUnits = createDakota07MapUnits();
  const locomotive = trainUnits(allUnits).find(({ movementGroupId, type }) => (
    movementGroupId === `${trainGroupPrefix}1` && type === 'train-10'
  ));
  assert.ok(locomotive);
  const { session } = await openScenario([player, locomotive]);
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: 3.5, y: 1.5 }), true);
    session.advance({ deltaMs: 0 });
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 8, targetY: 1.75 }), true);
    let view = session.observe();
    for (let frame = 0; frame < 50; frame += 1) view = session.advance({ deltaMs: 100 });
    const moved = view.units.find(({ id }) => id === player.id);
    const train = view.units.find(({ id }) => id === locomotive.id);
    assert.ok(moved && train?.collisionBoxFine);
    const playerRight = moved.positionFine.x + PLAYER_UNIT_COLLIDER_FINE.x + PLAYER_UNIT_COLLIDER_FINE.width;
    const trainLeft = train.positionFine.x + train.collisionBoxFine.x;
    assert.ok(playerRight <= trainLeft, 'the player stops at the moving train collision boundary');
  } finally {
    session.close();
  }
});
