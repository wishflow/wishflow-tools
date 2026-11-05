import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import {
  fortKaboomContent,
  fortKaboomRouteDefinitions,
  fortKaboomSpawnPoints,
} from '../src/content/fort-kaboom';
import { createGame, type CampaignWaveDefinition, type GameSession, type ScenarioContent } from '../src/game';
import {
  advanceCampaignUnitPool,
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
  queueCampaignUnitForSpawn,
  type CampaignUnitPoolRandom,
} from '../src/game/campaign-unit-pool';
import { captureReplayState } from '../src/game/replay';

const poolDefinition = fortKaboomContent.campaignUnitPool!;

class RecordingRandom implements CampaignUnitPoolRandom {
  readonly bounds: number[] = [];

  nextInt(bound: number): number {
    this.bounds.push(bound);
    return 0;
  }
}

function advancePoolFor(
  runtime: NonNullable<ReturnType<typeof createCampaignUnitPoolRuntime>>,
  durationMs: number,
  random: CampaignUnitPoolRandom,
  isBlocked: (spawn: Parameters<Parameters<typeof advanceCampaignUnitPool>[4]>[0]) => boolean,
) {
  const spawned = [];
  let remainingMs = durationMs;
  while (remainingMs > 0) {
    const deltaMs = Math.min(100, remainingMs);
    spawned.push(...advanceCampaignUnitPool(runtime, poolDefinition, deltaMs, random, isBlocked));
    remainingMs -= deltaMs;
  }
  return spawned;
}

function fortCampaignFixture(): ScenarioContent {
  const campaignWaves: CampaignWaveDefinition[] = Array.from({ length: 4 }, (_, index) => ({
    number: index + 1,
    delayMs: 0,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: index === 3 ? [{
      spawnPointId: 0,
      intervalMs: 20_000,
      requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }] : [],
  }));
  return {
    ...cowGulchContent,
    id: 'fort-kaboom-pool-test',
    contentVersion: 'fort-kaboom-pool-test-v1',
    formalSettlementSupported: true,
    title: { en: 'Fort Kaboom pool test', zh: 'Fort Kaboom 池规则测试' },
    map: fortKaboomContent.map,
    originalTileGrid: fortKaboomContent.originalTileGrid,
    units: fortKaboomContent.units,
    campaignUnitPool: poolDefinition,
    campaignWaveCount: campaignWaves.length,
    campaignWaves,
    previewWave: {
      ...cowGulchContent.previewWave!,
      spawn: fortKaboomSpawnPoints[0],
      additionalSpawns: fortKaboomSpawnPoints.slice(1),
      routes: fortKaboomRouteDefinitions,
      redirects: [],
      exit: { x: 21, y: 14 },
      additionalExits: [{ x: 21, y: 15 }],
    },
  };
}

function advanceFor(session: GameSession, durationMs: number) {
  let view = session.observe();
  let remainingMs = durationMs;
  while (remainingMs > 0) {
    const deltaMs = Math.min(100, remainingMs);
    view = session.advance({ deltaMs });
    remainingMs -= deltaMs;
  }
  return view;
}

test('wave 4 applies SET then SET_MAX, and later hires add to the pending Cannon count', () => {
  const runtime = createCampaignUnitPoolRuntime(poolDefinition)!;
  const random = new RecordingRandom();

  queueCampaignUnitForSpawn(runtime, poolDefinition, 'cannon');
  queueCampaignUnitForSpawn(runtime, poolDefinition, 'cannon');
  assert.equal(runtime.pending[3], 2);
  applyCampaignUnitPoolActions(runtime, poolDefinition, 4);
  assert.equal(runtime.pending[3], 1, 'ACTION_SET replaces the complete pending pool');
  assert.equal(runtime.maximum[3], 5, 'ACTION_SET_MAX changes the lifetime dispatch limit only');
  assert.equal(runtime.pending.slice(0, 37).reduce((sum, value) => sum + value, 0), 1);
  applyCampaignUnitPoolActions(runtime, poolDefinition, 4);
  assert.equal(runtime.pending[3], 1, 'repeating SET actions is stable');
  queueCampaignUnitForSpawn(runtime, poolDefinition, 'cannon');
  assert.equal(runtime.pending[3], 2);
  assert.deepEqual(random.bounds, []);
});

test('default zero lifetime cap prevents hired Cannons from dispatching before wave 4', () => {
  const runtime = createCampaignUnitPoolRuntime(poolDefinition)!;
  const random = new RecordingRandom();
  queueCampaignUnitForSpawn(runtime, poolDefinition, 'cannon');

  assert.equal(runtime.maximum[3], 0, 'SpawnPoolManager initializes maxUnits as zero-filled bytes');
  assert.deepEqual(advancePoolFor(runtime, 15_100, random, () => false), []);
  assert.equal(runtime.pending[3], 1);
  assert.equal(runtime.dispatched[3], 0);

  applyCampaignUnitPoolActions(runtime, poolDefinition, 4);
  assert.equal(runtime.pending[3], 1, 'wave 4 SET replaces earlier hire requests with its configured count');
  assert.equal(runtime.maximum[3], 5);
  assert.deepEqual(advancePoolFor(runtime, 15_100, random, () => false), []);
  assert.equal(runtime.pending[3], 0);
  assert.equal(runtime.dispatched[3], 1);
});

test('Fort pool starts after the strict 15-second timer and spawns at the source offset', () => {
  const runtime = createCampaignUnitPoolRuntime(poolDefinition)!;
  const random = new RecordingRandom();
  applyCampaignUnitPoolActions(runtime, poolDefinition, 4);
  const blocked: boolean[] = [];
  const isBlocked = () => {
    blocked.push(false);
    return false;
  };

  assert.deepEqual(advancePoolFor(runtime, 15_000, random, isBlocked), []);
  assert.equal(runtime.pending[3], 1, 'timer equal to zero has not ticked');
  assert.deepEqual(random.bounds, []);

  assert.deepEqual(advancePoolFor(runtime, 100, random, isBlocked), []);
  assert.equal(runtime.pending[3], 0);
  assert.equal(runtime.dispatched[3], 1);
  assert.deepEqual(random.bounds, [37, 1]);
  assert.deepEqual(advancePoolFor(runtime, 1_000, random, isBlocked), []);
  assert.equal(blocked.length, 0, 'a counter at exactly 500 ms has not attempted a spawn');

  const [spawn] = advancePoolFor(runtime, 100, random, isBlocked);
  assert.ok(spawn);
  assert.equal(spawn.id, 'cannon-spawn-01');
  assert.deepEqual(spawn.cell, { x: 10, y: 5 });
  assert.deepEqual(spawn.positionFine, { x: 80_640, y: 44_160 });
  assert.deepEqual(blocked, [false]);
  assert.deepEqual(advancePoolFor(runtime, 400, random, isBlocked), []);
  assert.equal(runtime.locations[0]?.spawning, false);
});

test('a blocked Fort retries the same dispatched Cannon without refunding or double-counting it', () => {
  const runtime = createCampaignUnitPoolRuntime(poolDefinition)!;
  const random = new RecordingRandom();
  applyCampaignUnitPoolActions(runtime, poolDefinition, 4);
  advancePoolFor(runtime, 15_100, random, () => false);

  let attempts = 0;
  assert.deepEqual(advancePoolFor(runtime, 1_100, random, () => {
    attempts += 1;
    return true;
  }), []);
  assert.equal(attempts, 1);
  assert.equal(runtime.pending[3], 0);
  assert.equal(runtime.dispatched[3], 1);
  assert.equal(runtime.locations[0]?.spawning, true);

  assert.deepEqual(advancePoolFor(runtime, 1_000, random, () => false), []);
  const [spawn] = advancePoolFor(runtime, 100, random, () => false);
  assert.ok(spawn, 'the same Fort request retries when the collision clears');
  assert.equal(attempts, 1);
  assert.equal(runtime.dispatched[3], 1);
  assert.equal(runtime.pending[3], 0);
});

test('Fort dispatches at most five Cannons per session and leaves excess stock queued', () => {
  const runtime = createCampaignUnitPoolRuntime(poolDefinition)!;
  const random = new RecordingRandom();
  applyCampaignUnitPoolActions(runtime, poolDefinition, 4);
  for (let index = 0; index < 10; index += 1) {
    queueCampaignUnitForSpawn(runtime, poolDefinition, 'cannon');
  }

  let spawnedCount = 0;
  for (let index = 0; index < 6; index += 1) {
    spawnedCount += advancePoolFor(runtime, 16_200, random, () => false).length;
  }
  assert.equal(spawnedCount, 5);
  assert.equal(runtime.dispatched[3], 5);
  assert.equal(runtime.pending[3], 6);
  assert.equal(random.bounds.filter((bound) => bound === 37).length, 6);
  assert.equal(random.bounds.filter((bound) => bound === 1).length, 5);
});

test('the real Fort scenario spawns a commandable Cannon deterministically at wave 4', async () => {
  assert.deepEqual(poolDefinition.spawnLocations.map(({ id, spawnLocationType, cell }) => ({ id, spawnLocationType, cell })), [
    { id: 'fort', spawnLocationType: 2, cell: { x: 10, y: 5 } },
  ]);
  assert.equal(cowGulchContent.campaignUnitPool, undefined, 'the map-specific pool does not affect Cow Gulch');

  const scenario = fortCampaignFixture();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });
  const firstSession = await game.open({ scenarioId: scenario.id, difficulty: 'easy', mode: 'formal', randomSeed: 11 });
  const secondSession = await game.open({ scenarioId: scenario.id, difficulty: 'easy', mode: 'formal', randomSeed: 11 });
  for (let index = 0; index < 3; index += 1) {
    firstSession.advance({ deltaMs: 0 });
    secondSession.advance({ deltaMs: 0 });
  }
  assert.equal(firstSession.observe().wave?.number, 4);
  assert.deepEqual(captureReplayState(firstSession.observe()), captureReplayState(secondSession.observe()));

  advanceFor(firstSession, 15_000);
  advanceFor(secondSession, 15_000);
  assert.equal(firstSession.observe().units.filter(({ id }) => id.startsWith('cannon-spawn-')).length, 0);
  assert.deepEqual(captureReplayState(firstSession.observe()), captureReplayState(secondSession.observe()));

  advanceFor(firstSession, 1_200);
  advanceFor(secondSession, 1_200);
  const firstView = firstSession.observe();
  const spawnedCannon = firstView.units.find(({ id }) => id === 'cannon-spawn-01');
  assert.ok(spawnedCannon);
  assert.equal(spawnedCannon.activity, 2);
  assert.deepEqual(spawnedCannon.positionFine, { x: 80_640, y: 44_160 });
  assert.equal(firstView.drawOrder.includes('unit:cannon-spawn-01'), true);
  assert.deepEqual(captureReplayState(firstView), captureReplayState(secondSession.observe()));

  const hitX = spawnedCannon.hitArea.x + spawnedCannon.hitArea.width / 2;
  const hitY = spawnedCannon.hitArea.y + spawnedCannon.hitArea.height / 2;
  assert.equal(firstSession.submitIntent({ type: 'select-at', x: hitX, y: hitY }), true);
  firstSession.advance({ deltaMs: 0 });
  assert.equal(firstSession.observe().units.find(({ id }) => id === spawnedCannon.id)?.selected, true);
  assert.equal(firstSession.submitIntent({ type: 'move-unit', targetX: 10.5, targetY: 8.5 }), true);
  assert.equal(firstSession.advance({ deltaMs: 0 }).units.find(({ id }) => id === spawnedCannon.id)?.moving, true);
  const movedView = advanceFor(firstSession, 300);
  assert.ok(
    movedView.units.find(({ id }) => id === spawnedCannon.id)!.positionFine.y > spawnedCannon.positionFine.y,
    'pool-spawned Cannon moves under the ordinary player-unit movement rules',
  );

  firstSession.close();
  secondSession.close();
});
