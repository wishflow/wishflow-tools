import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchP1dCampaignContent } from '../src/content/cow-gulch';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import type { GameReplayPayload } from '../src/game/replay';

const emptyRequests = Object.freeze([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

test('P1-D content matches the original Cow Gulch wave metadata and request pools', () => {
  assert.equal(cowGulchP1dCampaignContent.campaignWaveCount, 8);
  assert.deepEqual(cowGulchP1dCampaignContent.campaignWaves?.map((wave) => ({
    number: wave.number,
    hitPointMultiplierPercent: wave.hitPointMultiplierPercent,
    speedMultiplierPercent: wave.speedMultiplierPercent,
    spawnPools: wave.spawnPools.map((pool) => ({
      intervalMs: pool.intervalMs,
      intervalMultiplier: pool.intervalMultiplier,
      requests: [...pool.requests],
    })),
  })), [
    { number: 1, hitPointMultiplierPercent: 70, speedMultiplierPercent: 100,
      spawnPools: [{ intervalMs: 1500, intervalMultiplier: undefined, requests: [6, 2, 2, 0, 0, 0, 0, 0, 0, 0] }] },
    { number: 2, hitPointMultiplierPercent: 75, speedMultiplierPercent: 100,
      spawnPools: [{ intervalMs: 2000, intervalMultiplier: undefined, requests: [0, 2, 2, 3, 0, 0, 0, 0, 0, 0] }] },
    { number: 3, hitPointMultiplierPercent: 60, speedMultiplierPercent: 100,
      spawnPools: [{ intervalMs: 3000, intervalMultiplier: 2, requests: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0] }] },
    { number: 4, hitPointMultiplierPercent: 70, speedMultiplierPercent: 105,
      spawnPools: [{ intervalMs: 2500, intervalMultiplier: undefined, requests: [1, 3, 4, 4, 0, 2, 0, 0, 0, 0] }] },
    { number: 5, hitPointMultiplierPercent: 100, speedMultiplierPercent: 105,
      spawnPools: [{ intervalMs: 2500, intervalMultiplier: undefined, requests: [2, 3, 4, 5, 0, 3, 0, 0, 0, 0] }] },
    { number: 6, hitPointMultiplierPercent: 110, speedMultiplierPercent: 120,
      spawnPools: [{ intervalMs: 2500, intervalMultiplier: undefined, requests: [2, 2, 3, 3, 0, 4, 0, 0, 0, 0] }] },
    { number: 7, hitPointMultiplierPercent: 125, speedMultiplierPercent: 105,
      spawnPools: [{ intervalMs: 2500, intervalMultiplier: undefined, requests: [1, 2, 4, 4, 0, 5, 0, 0, 0, 0] }] },
    { number: 8, hitPointMultiplierPercent: 130, speedMultiplierPercent: 110,
      spawnPools: [{ intervalMs: 2250, intervalMultiplier: undefined, requests: [1, 3, 5, 5, 0, 6, 0, 0, 0, 0] }] },
  ]);
});

test('empty-request campaign fixture verifies automatic wave progression without gameplay coverage', async () => {
  const content: ScenarioContent = {
    ...cowGulchP1dCampaignContent,
    id: 'p1d-empty-auto-progression-fixture',
    units: [],
    campaignWaves: cowGulchP1dCampaignContent.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: emptyRequests })),
    })),
  };
  const game = createGame({ scenarios: { [content.id]: content }, sessionIdSource: () => 'p1d-auto-session' });
  const session = await game.open({ scenarioId: content.id, mode: 'formal', randomSeed: 17 });

  assert.equal(session.observe().wave?.number, 1);
  assert.equal(session.observe().wave?.phase, 'active');
  assert.equal(session.submitIntent({ type: 'start-wave' }), false);

  for (let number = 1; number < 8; number += 1) {
    const view = session.advance({ deltaMs: 0 });
    assert.equal(view.wave?.number, number + 1);
    assert.equal(view.wave?.phase, 'active');
    assert.equal(view.wave?.settlement, undefined, `wave ${number} must not settle the level`);
  }

  const victory = session.advance({ deltaMs: 0 });
  assert.equal(victory.wave?.number, 8);
  assert.equal(victory.wave?.phase, 'complete');
  assert.equal(victory.wave?.settlement?.outcome, 'victory');
  assert.equal(session.terminalRecord()?.outcome, 'victory');
  const serialized = await session.exportReplay();
  const replay = await game.replay(serialized);
  assert.equal(replay.session.terminalRecord()?.outcome, 'victory');
  const payload = JSON.parse(serialized) as GameReplayPayload & { digest: string };
  assert.ok(payload.frames.every((frame) => frame.intents.length === 0));
});

test('projects pending campaign spawn indicators with the original entrance and boss metadata', async () => {
  const content: ScenarioContent = {
    ...cowGulchP1dCampaignContent,
    id: 'p1d-spawn-indicator-projection-fixture',
    previewWave: {
      ...cowGulchP1dCampaignContent.previewWave!,
      additionalSpawns: [
        { cell: { x: 14, y: 5 }, direction: 'west' },
        { cell: { x: 7, y: 2 }, direction: 'south' },
      ],
    },
    campaignWaves: [{
      ...cowGulchP1dCampaignContent.campaignWaves![0]!,
      spawnPools: [
        { spawnPointId: 0, intervalMs: 1500, requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        { spawnPointId: 1, intervalMs: 1500, requests: [...emptyRequests] },
        { spawnPointId: 2, intervalMs: 1500, requests: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
      ],
    }],
  };
  const game = createGame({ scenarios: { [content.id]: content } });
  const session = await game.open({ scenarioId: content.id, mode: 'formal', randomSeed: 9 });

  assert.deepEqual(session.observe().wave?.spawnIndicators, [
    { spawnPointId: 0, cell: { x: 0, y: 10 }, direction: 'east', boss: false },
    { spawnPointId: 2, cell: { x: 7, y: 2 }, direction: 'south', boss: true },
  ]);
});

test('a defeated original campaign can be reopened from wave one without saved partial progress', async () => {
  const content: ScenarioContent = {
    ...cowGulchP1dCampaignContent,
    id: 'p1d-defeat-restart-fixture',
    units: [],
    previewWave: { ...cowGulchP1dCampaignContent.previewWave!, initialLives: 1, baseEnemySpeed: 500_000 },
  };
  const game = createGame({ scenarios: { [content.id]: content } });
  const first = await game.open({ scenarioId: content.id, mode: 'formal', randomSeed: 9 });
  let view = first.observe();
  for (let frame = 0; frame < 100 && !first.terminalRecord(); frame += 1) {
    view = first.advance({ deltaMs: 100 });
  }
  assert.equal(view.wave?.phase, 'complete');
  assert.equal(view.wave?.lives, 0);
  assert.equal(first.terminalRecord()?.outcome, 'defeat');

  const restarted = await game.open({ scenarioId: content.id, mode: 'formal', randomSeed: 9 });
  assert.equal(restarted.observe().frame, 0);
  assert.equal(restarted.observe().wave?.number, 1);
  assert.equal(restarted.observe().wave?.phase, 'active');
  assert.equal(restarted.observe().wave?.lives, 1);
  assert.equal(restarted.observe().enemies.length, 0);
});
