import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, type ScenarioContent } from '../src/game';

const scenario: ScenarioContent = {
  id: 'draw-order-history-fixture',
  title: { en: 'Draw order history', zh: '绘制顺序历史' },
  map: {
    width: 17,
    height: 17,
    tileSize: 32,
    background: [],
    streets: [],
    decorations: [{ asset: 'map_prop', cell: { x: 8, y: 8 } }],
  },
  units: [{
    id: 'unit-1',
    type: 'gunslinger',
    cell: { x: 8, y: 8 },
    movementSpeedFinePer100Ms: 1920,
    asset: 'player_gunslinger',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render: { x: 8, y: 7.625, width: 1, height: 1.375 },
    hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
  }],
};

test('Game preserves draw-order history across unrendered steps and returns to an equal-depth tie', async () => {
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 5,
  });

  assert.deepEqual(session.observe().drawOrder, ['unit:unit-1', 'decoration:0']);
  assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 8.5 }), true);
  session.advance({ deltaMs: 0 });
  assert.equal(session.observe().units[0]?.selected, true);
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 8.5, targetY: 9.5 }), true);

  // No view is rendered while the unit crosses the prop's depth and then returns to its depth.
  session.advance({ deltaMs: 100 });
  const crossed = session.advance({ deltaMs: 100 });
  assert.ok(crossed.units[0]!.positionFine.y > 9 * 7680);
  assert.deepEqual(crossed.drawOrder, ['decoration:0', 'unit:unit-1']);
  assert.equal(session.submitIntent({ type: 'move-unit', targetX: 8.5, targetY: 8.75 }), true);
  const retied = session.advance({ deltaMs: 100 });
  assert.equal(retied.units[0]!.positionFine.y, 9 * 7680);

  assert.deepEqual(session.observe().drawOrder, ['decoration:0', 'unit:unit-1']);
});
