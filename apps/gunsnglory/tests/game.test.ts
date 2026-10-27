import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
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

test('does not create the controlled wave until the start intent advances', async () => {
  const session = await createGame({ scenarios: { 'cow-gulch': cowGulchContent } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 1234,
  });
  const before = session.observe();

  assert.equal(before.wave?.phase, 'not-started');
  assert.equal(before.enemies.length, 0);
  assert.equal(before.wave?.lives, 50);
  assert.equal(session.submitIntent({ type: 'start-wave' }), true);
  assert.equal(session.observe().enemies.length, 0);

  const started = session.advance({ deltaMs: 1000 });
  assert.equal(started.wave?.phase, 'active');
  assert.equal(started.enemies.length, 1);
  assert.deepEqual(started.enemies[0]?.positionFine, { x: -11520, y: 80640 });
  assert.equal(started.enemies[0]?.speed, 490, 'seed 1234 uses Java Random nextInt(20) = 8');
  assert.equal(started.wave?.lives, 50);
  assert.equal(session.startRecord.randomSeed, 1234);

  const moved = session.advance({ deltaMs: 1000 });
  assert.equal(moved.enemies[0]?.positionFine.x, -11520 + started.enemies[0]!.speed);
  assert.equal(moved.elapsedMs, 200);
});

test('replays the Cow Gulch preview and applies the escape penalty exactly once', async () => {
  const run = async () => {
    const session = await createGame({ scenarios: { 'cow-gulch': cowGulchContent } }).open({
      scenarioId: 'cow-gulch',
      randomSeed: 42,
    });
    session.submitIntent({ type: 'start-wave' });
    let view = session.advance({ deltaMs: 0 });
    let steps = 0;
    while (view.wave?.phase === 'active' && steps < 2000) {
      view = session.advance({ deltaMs: 100 });
      steps += 1;
    }
    return { view, steps };
  };

  const first = await run();
  const replay = await run();

  assert.ok(first.steps < 2000, 'the controlled enemy should reach the Cow Gulch exit');
  assert.deepEqual(first, replay);
  assert.equal(first.view.wave?.phase, 'complete');
  assert.equal(first.view.wave?.lives, 49);
  assert.equal(first.view.wave?.escapedEnemies, 1);
  assert.equal(first.view.enemies.length, 0);

  const session = await createGame({ scenarios: { 'cow-gulch': cowGulchContent } }).open({ scenarioId: 'cow-gulch', randomSeed: 42 });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  for (let index = 0; index < 2000 && view.wave?.phase !== 'complete'; index += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  const after = session.advance({ deltaMs: 100 });
  assert.equal(after.wave?.lives, 49);
  assert.equal(after.wave?.escapedEnemies, 1);
});

test('keeps the pioneer inside the TDM route cells from spawn through the exit', async () => {
  const definition = cowGulchPreviewWave;
  const waypoints = [definition.spawn.cell, ...definition.redirects.map(({ cell }) => cell), definition.exit];
  const routeCells = new Set<string>();

  for (let index = 1; index < waypoints.length; index += 1) {
    const from = waypoints[index - 1]!;
    const to = waypoints[index]!;
    const stepX = Math.sign(to.x - from.x);
    const stepY = Math.sign(to.y - from.y);
    let x = from.x;
    let y = from.y;
    while (true) {
      routeCells.add(`${x},${y}`);
      if (x === to.x && y === to.y) break;
      x += stepX;
      y += stepY;
    }
  }

  const session = await createGame({ scenarios: { 'cow-gulch': cowGulchContent } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });

  for (let step = 0; step < 2000 && view.wave?.phase === 'active'; step += 1) {
    const enemy = view.enemies[0];
    if (enemy) {
      const x = Math.floor(enemy.positionFine.x / 7680);
      const y = Math.floor(enemy.positionFine.y / 7680);
      if (x >= 0 && x < cowGulchContent.map.width && y >= 0 && y < cowGulchContent.map.height) {
        assert.ok(routeCells.has(`${x},${y}`), `enemy must stay on the TDM route at (${x}, ${y})`);
      }
    }
    view = session.advance({ deltaMs: 100 });
  }

  assert.equal(view.wave?.phase, 'complete', 'the sample should leave the map through its TDM exit');
});

test('observing a running wave does not advance time, position, or its random stream', async () => {
  const createSession = () => createGame({ scenarios: { 'cow-gulch': cowGulchContent } })
    .open({ scenarioId: 'cow-gulch', randomSeed: 9876 });
  const observed = await createSession();
  const control = await createSession();

  for (const session of [observed, control]) {
    session.submitIntent({ type: 'start-wave' });
    session.advance({ deltaMs: 0 });
  }
  for (let index = 0; index < 50; index += 1) observed.observe();

  assert.deepEqual(observed.advance({ deltaMs: 37 }), control.advance({ deltaMs: 37 }));
  assert.deepEqual(observed.advance({ deltaMs: 100 }), control.advance({ deltaMs: 100 }));
});

test('keeps preview waves and random streams isolated between sessions', async () => {
  const game = createGame({ scenarios: { 'cow-gulch': cowGulchContent } });
  const first = await game.open({ scenarioId: 'cow-gulch', randomSeed: 77 });
  const second = await game.open({ scenarioId: 'cow-gulch', randomSeed: 77 });

  first.submitIntent({ type: 'start-wave' });
  const firstStarted = first.advance({ deltaMs: 0 });
  assert.equal(second.observe().wave?.phase, 'not-started');
  assert.equal(second.observe().enemies.length, 0);

  second.submitIntent({ type: 'start-wave' });
  const secondStarted = second.advance({ deltaMs: 0 });
  assert.deepEqual(firstStarted, secondStarted);
  assert.deepEqual(first.advance({ deltaMs: 37 }), second.advance({ deltaMs: 37 }));
});

test('follows the first Cow Gulch redirect and clamps variable time to the original 100 ms bound', async () => {
  const session = await createGame({ scenarios: { 'cow-gulch': cowGulchContent } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  const startX = view.enemies[0]!.positionFine.x;

  view = session.advance({ deltaMs: 0.9 });
  assert.equal(view.enemies[0]!.positionFine.x, startX, 'sub-millisecond time truncates to zero');

  const variableSession = await createGame({ scenarios: { 'cow-gulch': cowGulchContent } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 1234,
  });
  variableSession.submitIntent({ type: 'start-wave' });
  const variableStart = variableSession.advance({ deltaMs: 0 });
  const variableSpeed = variableStart.enemies[0]!.speed;
  const variableStartX = variableStart.enemies[0]!.positionFine.x;
  const expectedAfter37 = Math.trunc(Math.fround(
    variableStartX + Math.fround((variableSpeed * 37) / 100),
  ));
  const after37 = variableSession.advance({ deltaMs: 37 });
  assert.equal(after37.enemies[0]!.positionFine.x, expectedAfter37);
  const expectedAfter100 = Math.trunc(Math.fround(
    expectedAfter37 + Math.fround((variableSpeed * 63) / 100),
  ));
  const after100 = variableSession.advance({ deltaMs: 63 });
  assert.equal(after100.enemies[0]!.positionFine.x, expectedAfter100);
  assert.equal(after100.enemies[0]!.positionFine.x - variableStartX, 491);

  let steps = 0;
  while (view.enemies[0]?.direction === 'east' && steps < 1000) {
    view = session.advance({ deltaMs: 100 });
    steps += 1;
  }
  assert.ok(steps < 1000, 'enemy should reach the first route redirect');
  assert.equal(view.enemies[0]?.direction, 'south');
  assert.equal(Math.trunc(view.enemies[0]!.positionFine.x / 7680), 4);
  assert.deepEqual(view.enemies[0]?.positionFine, {
    x: (4 * 7680) + 3840,
    y: (10 * 7680) + 3840 + 2,
  }, 'the redirect snaps to the native field center before continuing');

  const before = view.enemies[0]!.positionFine.y;
  view = session.advance({ deltaMs: 1000 });
  assert.equal(view.enemies[0]!.positionFine.y - before, view.enemies[0]!.speed);
});

test('does not snap an enemy back when a route marker keeps its current direction', async () => {
  const sameDirectionScenario: ScenarioContent = {
    ...cowGulchContent,
    id: 'same-direction-marker',
    previewWave: {
      ...cowGulchContent.previewWave!,
      redirects: [{ cell: { x: 4, y: 10 }, directions: ['east'] }],
    },
  };
  const session = await createGame({ scenarios: { [sameDirectionScenario.id]: sameDirectionScenario } }).open({
    scenarioId: sameDirectionScenario.id,
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  const center = (4 * 7680) + 3840;
  let crossed = false;

  for (let step = 0; step < 1000; step += 1) {
    const previousX = view.enemies[0]!.positionFine.x;
    view = session.advance({ deltaMs: 100 });
    const enemy = view.enemies[0]!;
    if (previousX < center && enemy.positionFine.x > center) {
      assert.equal(enemy.direction, 'east');
      assert.equal(enemy.positionFine.x, previousX + enemy.speed);
      assert.ok(enemy.positionFine.x > center + 2, 'same-direction markers do not reset the fine position');
      crossed = true;
      break;
    }
  }

  assert.equal(crossed, true, 'enemy reaches the same-direction route marker');
});

test('follows every Cow Gulch route turn at its native field center', async () => {
  const expectedTurns = [
    { direction: 'south', cell: { x: 4, y: 10 } },
    { direction: 'east', cell: { x: 4, y: 13 } },
    { direction: 'north', cell: { x: 12, y: 13 } },
    { direction: 'west', cell: { x: 12, y: 6 } },
    { direction: 'north', cell: { x: 9, y: 6 } },
    { direction: 'east', cell: { x: 9, y: 2 } },
    { direction: 'south', cell: { x: 12, y: 2 } },
    { direction: 'east', cell: { x: 12, y: 3 } },
  ] as const;
  const session = await createGame({ scenarios: { 'cow-gulch': cowGulchContent } }).open({
    scenarioId: 'cow-gulch',
    randomSeed: 42,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  let nextTurnIndex = 0;

  for (let step = 0; step < 2000 && view.wave?.phase === 'active'; step += 1) {
    view = session.advance({ deltaMs: 100 });
    const enemy = view.enemies[0];
    if (!enemy) continue;

    const expected = expectedTurns[nextTurnIndex];
    if (!expected) continue;
    const vector = {
      east: { x: 1, y: 0 },
      south: { x: 0, y: 1 },
      west: { x: -1, y: 0 },
      north: { x: 0, y: -1 },
    }[expected.direction];
    const expectedPosition = {
      x: (expected.cell.x * 7680) + 3840 + (vector.x * 2),
      y: (expected.cell.y * 7680) + 3840 + (vector.y * 2),
    };
    if (enemy.positionFine.x === expectedPosition.x && enemy.positionFine.y === expectedPosition.y) {
      assert.equal(enemy.direction, expected.direction);
      nextTurnIndex += 1;
    }
  }

  assert.equal(view.wave?.phase, 'complete');
  assert.equal(nextTurnIndex, expectedTurns.length);
});
