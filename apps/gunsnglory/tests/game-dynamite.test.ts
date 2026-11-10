import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchPreviewWave } from '../src/content/cow-gulch-preview-wave';
import { createGame, type GameSession, type ScenarioContent } from '../src/game';
import { DYNAMITE_COOLDOWN_MS } from '../src/game/dynamite';
import { captureReplayState } from '../src/game/replay';

const scenario: ScenarioContent = {
  id: 'dynamite-rules-fixture',
  contentVersion: 'dynamite-rules-fixture-v1',
  title: { en: 'Dynamite rules fixture', zh: '炸药规则样本' },
  map: { width: 17, height: 17, tileSize: 32, background: [], streets: [] },
  units: [{
    id: 'gunslinger-1',
    type: 'gunslinger',
    cell: { x: 8, y: 8 },
    movementSpeedFinePer100Ms: 1_500,
    asset: 'player_gunslinger',
    frame: { x: 0, y: 0, width: 32, height: 44 },
    render: { x: 8, y: 7.625, width: 1, height: 1.375 },
    hitArea: { x: 8, y: 7.625, width: 1, height: 1.375 },
  }],
  dynamite: {
    unlocked: true,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 2, y: 2 }, boxCell: { x: 4, y: 2 } }],
  },
  previewWave: {
    ...cowGulchPreviewWave,
    initialLives: 10,
    initialCash: 0,
    spawn: { cell: { x: 6, y: 2 }, direction: 'west' },
    additionalSpawns: [],
    baseEnemySpeed: 0,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    redirects: [],
    exit: { x: 0, y: 2 },
    enemy: {
      hitPoints: 5_000,
      cashReward: 0,
      penetration: { light: 100, fire: 100, heavy: 25, poison: 100 },
    },
  },
};

async function openDynamiteSession(content: ScenarioContent = scenario): Promise<GameSession> {
  return createGame({ scenarios: { [content.id]: content } }).open({ scenarioId: content.id, randomSeed: 11 });
}

test('clicking an unlocked trigger blasts its paired box once without changing unit selection', async () => {
  const session = await openDynamiteSession();
  session.submitIntent({ type: 'select-at', x: 8.5, y: 8.5 });
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.units[0]?.selected, true);

  session.submitIntent({ type: 'start-wave' });
  view = session.advance({ deltaMs: 0 });
  const enemy = view.enemies[0]!;
  assert.deepEqual(enemy.positionFine, { x: 34_560, y: 19_200 });
  assert.equal(enemy.hitPoints, 5_000);

  session.submitIntent({ type: 'select-at', x: 2.5, y: 2.5 });
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.units[0]?.selected, true, 'the detonator does not clear or acquire player-unit selection');
  assert.equal(view.enemies[0]?.hitPoints, 3_750);
  assert.deepEqual(view.events.filter((event) => event.type === 'dynamite-exploded'), [{
    type: 'dynamite-exploded',
    dynamiteId: 'dynamite-1',
    affectedEnemyIds: [enemy.id],
  }]);
  assert.ok(view.events.some((event) => event.type === 'sound-requested' && event.sound === 'sound_explosion'));
  assert.equal(view.dynamites?.[0]?.cooldownRemainingMs, DYNAMITE_COOLDOWN_MS);
  assert.equal(view.dynamites?.[0]?.boxPhase, 'absent');
  assert.equal(view.dynamiteExplosions?.[0]?.animationFrame, 0);
  assert.deepEqual(captureReplayState(view).dynamites, view.dynamites);
  assert.equal(session.observe().enemies[0]?.hitPoints, 3_750, 'repeat observations do not apply damage again');

  session.submitIntent({ type: 'select-at', x: 2.5, y: 2.5 });
  view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies[0]?.hitPoints, 3_750);
  assert.equal(view.events.some((event) => event.type === 'dynamite-exploded'), false);
  assert.ok(view.events.some((event) => event.type === 'dynamite-cooling-down' && event.remainingMs === DYNAMITE_COOLDOWN_MS));
  assert.equal(view.dynamites?.[0]?.cooldownRemainingMs, DYNAMITE_COOLDOWN_MS);
});

test('paired box stays absent until its final 500 ms, then plays all five respawn frames', async () => {
  const session = await openDynamiteSession();
  session.submitIntent({ type: 'select-at', x: 2.5, y: 2.5 });
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.dynamites?.[0]?.cooldownRemainingMs, DYNAMITE_COOLDOWN_MS);

  for (let index = 0; index < 584; index += 1) view = session.advance({ deltaMs: 100 });
  assert.equal(view.dynamites?.[0]?.cooldownRemainingMs, 600);
  assert.equal(view.dynamites?.[0]?.boxPhase, 'absent');
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.dynamites?.[0]?.cooldownRemainingMs, 500);
  assert.equal(view.dynamites?.[0]?.boxPhase, 'respawning');
  assert.equal(view.dynamites?.[0]?.boxAnimationFrame, 0);
  for (const frame of [1, 2, 3, 4]) {
    view = session.advance({ deltaMs: 100 });
    assert.equal(view.dynamites?.[0]?.boxAnimationFrame, frame);
  }
  view = session.advance({ deltaMs: 100 });
  assert.equal(view.dynamites?.[0]?.cooldownRemainingMs, 0);
  assert.equal(view.dynamites?.[0]?.boxPhase, 'present');
});

test('locked dynamite remains inert and does not emit interaction events', async () => {
  const lockedScenario: ScenarioContent = {
    ...scenario,
    id: 'locked-dynamite-fixture',
    dynamite: { ...scenario.dynamite!, unlocked: false },
  };
  const session = await openDynamiteSession(lockedScenario);
  session.submitIntent({ type: 'select-at', x: 2.5, y: 2.5 });
  const view = session.advance({ deltaMs: 0 });
  assert.equal(view.dynamites?.[0]?.unlocked, false);
  assert.equal(view.dynamiteExplosions?.length, 0);
  assert.equal(view.events.some((event) => event.type.startsWith('dynamite-')), false);
});
