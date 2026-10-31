import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import { createGame } from '../src/game';

test('removes an enemy on the frame it crosses the map boundary between field centers', async () => {
  const scenario = {
    ...cowGulchContent,
    id: 'p1f-map-boundary-cleanup',
    units: [],
    campaignWaveCount: undefined,
    campaignWaves: undefined,
    previewWave: {
      ...cowGulchContent.previewWave!,
      spawn: { cell: { x: 0, y: 10 }, direction: 'west' as const },
      baseEnemySpeed: 500,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      redirects: [],
      exit: { x: 0, y: 0 },
    },
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    randomSeed: 1,
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  assert.equal(view.enemies[0]?.positionFine.x, -11520);
  assert.equal(view.enemies[0]?.speed, 500);

  for (let frame = 0; frame < 30; frame += 1) {
    const enemy = view.enemies[0];
    assert.ok(enemy, 'the enemy remains until it crosses the cleanup boundary');
    const nextX = enemy.positionFine.x - enemy.speed;
    view = session.advance({ deltaMs: 100 });
    if (nextX <= -3 * 7680) {
      assert.equal(view.enemies.length, 0, 'out-of-map cleanup does not wait for another field-center crossing');
      assert.equal(view.wave?.escapedEnemies, 1);
      assert.equal(view.wave?.lives, 49);
      return;
    }
    assert.equal(view.enemies.length, 1);
  }

  assert.fail('enemy should be removed as soon as fullX reaches -3');
});
