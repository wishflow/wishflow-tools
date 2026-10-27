import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, type ScenarioContent } from '../src/game';

const scenario: ScenarioContent = {
  id: 'fixture',
  title: { en: 'Test map', zh: '测试地图' },
  map: {
    width: 17,
    height: 17,
    tileSize: 32,
    background: [],
    streets: [],
  },
  units: [{
    id: 'gunslinger-1',
    type: 'gunslinger',
    cell: { x: 8, y: 8 },
    asset: 'player_gunslinger',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render: { x: 8, y: 7.625, width: 1, height: 1.375 },
    hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
  }],
};

test('opens a controlled scene with one unselected unit and isolates observations', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });
  const initial = session.observe();

  assert.equal(initial.frame, 0);
  assert.equal(initial.units.length, 1);
  assert.equal(initial.units[0]?.selected, false);
  assert.throws(() => {
    (initial.units[0] as { selected: boolean }).selected = true;
  }, TypeError);
  assert.equal(session.observe().units[0]?.selected, false);
});

test('selects a unit only inside its hit area and clears selection on empty ground', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });

  assert.equal(session.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 }), true);
  const selected = session.advance();
  assert.equal(selected.units[0]?.selected, true);
  assert.equal(selected.frame, 1);

  assert.equal(session.submitIntent({ type: 'select-at', x: 1.5, y: 1.5 }), true);
  const cleared = session.advance();
  assert.equal(cleared.units[0]?.selected, false);
  assert.equal(cleared.frame, 2);
});

test('rejects malformed coordinates without enqueuing a command', async () => {
  const session = await createGame({ scenarios: { fixture: scenario } }).open({ scenarioId: 'fixture' });

  assert.equal(session.submitIntent({ type: 'select-at', x: Number.NaN, y: 0 }), false);
  assert.equal(session.observe().frame, 0);
  assert.equal(session.advance().frame, 1);
});

test('keeps sessions independent and rejects unknown scenarios', async () => {
  const game = createGame({ scenarios: { fixture: scenario } });
  const first = await game.open({ scenarioId: 'fixture' });
  const second = await game.open({ scenarioId: 'fixture' });

  first.submitIntent({ type: 'select-at', x: 8.5, y: 8.25 });
  first.advance();
  assert.equal(first.observe().units[0]?.selected, true);
  assert.equal(second.observe().units[0]?.selected, false);
  await assert.rejects(() => game.open({ scenarioId: 'missing' }), /unknown scenario/i);
});
