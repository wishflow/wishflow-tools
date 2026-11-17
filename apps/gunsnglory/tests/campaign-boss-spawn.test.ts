import assert from 'node:assert/strict';
import test from 'node:test';
import { createOregon02CampaignContent } from '../src/content/oregon-02-campaign';
import { mississippiEnemyByType } from '../src/content/mississippi-enemy-designs';
import { createGame, type ScenarioContent } from '../src/game';

test('campaign Boss uses APK type 7 data and is consumed from request index 8', async () => {
  assert.deepEqual(mississippiEnemyByType[7], {
    hitPoints: 2_500,
    cashReward: 50,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
    turningDurationMs: 100,
  });

  const source = createOregon02CampaignContent();
  const lastWave = source.campaignWaves!.at(-1)!;
  assert.equal(lastWave.spawnPools[0]?.requests[8], 1);
  assert.equal(lastWave.spawnPools[0]?.requests[9], 0);
  const content: ScenarioContent = {
    ...source,
    id: 'campaign-boss-spawn-fixture',
    campaignWaveCount: 1,
    campaignWaves: [{ ...lastWave, number: 1, delayMs: 0, hitPointMultiplierPercent: 100, speedMultiplierPercent: 100 }],
  };
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 22_222,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.spawnIndicators?.find(({ spawnPointId }) => spawnPointId === lastWave.spawnPools[0]?.spawnPointId)?.boss, true);
    for (let frame = 0; frame < 20 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    const boss = view.enemies.find(({ type }) => type === 7);
    assert.ok(boss, 'APK slot 10 request must spawn one Boss');
    assert.equal(boss.type, 7);
    assert.equal(boss.asset, 'boss');
    assert.equal(boss.speed, 500);
    assert.ok(boss.maxHitPoints > 0);
    assert.deepEqual(view.events.find((event) => event.type === 'enemy-group-spawned'), {
      type: 'enemy-group-spawned',
      enemyIds: [boss.id],
      waveNumber: 1,
      spawnPointId: lastWave.spawnPools[0]!.spawnPointId,
      requestType: 7,
      groupSize: 1,
    });
  } finally {
    session.close();
  }
});
