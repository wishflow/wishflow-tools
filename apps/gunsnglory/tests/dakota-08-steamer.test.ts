import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-08.json';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import { createDakota08SteamerUnits } from '../src/content/dakota-08-units';
import { createGame, type ScenarioContent } from '../src/game';
import { createPlayerMapCollisionBoxes } from '../src/game/player-collision-geometry';

const FINE_PER_CELL = 7_680;

function createScenario(): ScenarioContent {
  return {
    id: 'wayne-waters-steamer-probe',
    title: { en: 'Wayne Waters Steamer probe', zh: 'Wayne Waters 蒸汽船探针' },
    map: createDakota08MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota08SteamerUnits(),
  };
}

test('Wayne Waters Steamer creates five correct TDM parts and sleeping Cannon hires', () => {
  assert.deepEqual(map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 120 || code === 121 || code === 123 ? [[code, x, y]] : []
  ))), [[120, 11, 11], [121, 13, 11], [121, 14, 11], [123, 15, 11]]);

  const units = createDakota08SteamerUnits();
  assert.deepEqual(units.map(({ type, activity, cell, asset }) => [type, activity, cell.x, cell.y, asset]), [
    ['steamer-30', 5, 11, 11, 'steamboat_1'],
    ['steamer-31', 5, 12, 11, 'steamboat_2'],
    ['steamer-32', 4, 13, 11, 'steamboat_3'],
    ['steamer-32', 4, 14, 11, 'steamboat_3'],
    ['steamer-33', 5, 15, 11, 'steamboat_4a'],
  ]);
  assert.equal(new Set(units.map(({ id }) => id)).size, 5);
  assert.equal(new Set(units.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(units.every(({ movementAxis, movementSurface, movementSpeedFinePer100Ms, collisionBoxFine }) => (
    movementAxis === 'horizontal' && movementSurface === 'water' && movementSpeedFinePer100Ms === 1_000
      && collisionBoxFine?.x === -3_840 && collisionBoxFine.y === -4_608
      && collisionBoxFine.width === FINE_PER_CELL && collisionBoxFine.height === 4_608
  )));
  const cannons = units.filter(({ type }) => type === 'steamer-32');
  assert.deepEqual(cannons.map(({ activity, hirePrice, showSleepingEffect, weapon }) => [
    activity, hirePrice, showSleepingEffect, weapon?.damage, weapon?.damageType,
  ]), [[4, 150, true, 650, 'heavy'], [4, 150, true, 650, 'heavy']]);
});

test('Wayne Waters Steamer moves as one water group without self-collision', async () => {
  const scenario = createScenario();
  assert.ok(scenario.map.backgroundCollisionCodes?.[11]?.slice(9, 22).every((code) => code === 96),
    'the original hull lane is Dakota water');
  const collisions = createPlayerMapCollisionBoxes(map.originalTileGrid, scenario.map.decorations, undefined);
  assert.equal(collisions.some(({ sourceTdmCode }) => sourceTdmCode === 120 || sourceTdmCode === 121 || sourceTdmCode === 123), false,
    'Steamer pieces are dynamic units, not duplicate static scenery');

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  try {
    assert.equal(session.submitIntent({ type: 'select-at', x: 11.5, y: 11.5 }), true);
    let view = session.advance({ deltaMs: 0 });
    assert.ok(view.units.some(({ id, selected }) => id.includes('dakota-08-steamer-') && selected));
    assert.equal(session.submitIntent({ type: 'move-unit', targetX: 23, targetY: 11.5 }), true);
    view = session.advance({ deltaMs: 0 });
    for (let frame = 0; frame < 180 && view.units.some(({ moving }) => moving); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const group = view.units.filter(({ movementGroupId }) => movementGroupId === 'dakota-08-steamer-11-11');
    assert.equal(group.length, 5);
    assert.ok(group.every(({ moving }) => !moving), 'all parts stop at the bank');
    assert.ok(group[0]!.positionFine.x - (11 * FINE_PER_CELL + FINE_PER_CELL / 2) > 6.5 * FINE_PER_CELL,
      `the group moves to the bank without self-collision: ${JSON.stringify(group.map(({ id, positionFine, moving }) => ({ id, positionFine, moving })))}`);
    assert.ok(group.slice(1).every((unit, index) => unit.positionFine.x - group[index]!.positionFine.x === FINE_PER_CELL),
      'all components retain one-cell spacing');
  } finally {
    session.close();
  }
});
