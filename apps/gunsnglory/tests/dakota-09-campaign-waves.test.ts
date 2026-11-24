import assert from 'node:assert/strict';
import test from 'node:test';
import { dakota09CampaignWaves, dakota09CampaignSpawnRequestCount } from '../src/content/dakota-09-campaign-waves';
import { createDakota09CampaignContent } from '../src/content/dakota-09-campaign';
import { dakota09SpawnPointIdByActionId } from '../src/content/dakota-09-routes';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedPool {
  actionId: number;
  intervalMs: number;
  counts: readonly number[];
  bossCount?: number;
  docCount?: number;
}

interface ExpectedWave {
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  pools: readonly ExpectedPool[];
}

// Independent expected final Wave rows transcribed from the APK i == 39 branch.
// The APK contains 17 addToWave calls; Wave stores one mutable row per action ID,
// so Wave 2's identical duplicate action-1 call overwrites itself and has no second pool.
const expectedSourceCallCountByWave = [1, 2, 2, 2, 3, 3, 3, 1] as const;
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    pools: [{ actionId: 0, intervalMs: 1_500, counts: [2, 6, 7, 8, 0, 2, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 150,
    pools: [{ actionId: 1, intervalMs: 1_500, counts: [1, 0, 0, 1, 12, 2, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, intervalMs: 1_500, counts: [1, 1, 2, 2, 1, 4, 0, 0] },
      { actionId: 1, intervalMs: 1_500, counts: [1, 1, 2, 2, 1, 4, 0, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 3_000, counts: [0, 0, 1, 2, 1, 1, 4, 1] },
      { actionId: 1, intervalMs: 3_000, counts: [0, 0, 1, 2, 1, 1, 4, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 4_500, counts: [0, 0, 1, 2, 2, 1, 1, 2] },
      { actionId: 1, intervalMs: 4_500, counts: [0, 0, 1, 2, 2, 1, 1, 2] },
      { actionId: 2, intervalMs: 3_500, counts: [2, 2, 2, 2, 2, 1, 1, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 4, 3, 4, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 2, 3, 4, 4, 3, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 3, 4, 3, 4, 1, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 205, speedMultiplierPercent: 160,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 2, 2, 4, 4, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 1, 2, 2, 4, 3, 2, 2] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 2, 2, 4, 4, 2, 2] },
    ] },
  { delayMs: 30_000, hitPointMultiplierPercent: 195, speedMultiplierPercent: 165,
    pools: [{ actionId: 2, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
];

function waveShape(wave: CampaignWaveDefinition) {
  return {
    number: wave.number,
    delayMs: wave.delayMs,
    hitPointMultiplierPercent: wave.hitPointMultiplierPercent,
    speedMultiplierPercent: wave.speedMultiplierPercent,
    spawnPools: wave.spawnPools.map(({ spawnPointId, intervalMs, requests }) => [spawnPointId, intervalMs, requests] as const),
  };
}

function expectedWaves() {
  return expectedWaveRows.map(({ delayMs, hitPointMultiplierPercent, speedMultiplierPercent, pools }, index) => ({
    number: index + 1,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: pools.map(({ actionId, intervalMs, counts, bossCount = 0, docCount = 0 }) => (
      [dakota09SpawnPointIdByActionId[actionId], intervalMs, [...counts, bossCount, docCount]] as const
    )),
  }));
}

function scenarioWithWaves(campaignWaves: readonly CampaignWaveDefinition[]): ScenarioContent {
  return {
    ...createDakota09CampaignContent(),
    id: 'snow-town-wave-test',
    campaignWaveCount: campaignWaves.length,
    campaignWaves,
  };
}

test('Snow Town stores eight source waves and sixteen effective spawn pools from seventeen APK calls', () => {
  assert.deepEqual(dakota09CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(dakota09CampaignWaves.length, 8);
  assert.equal(expectedSourceCallCountByWave.reduce((sum, count) => sum + count, 0), 17);
  assert.equal(dakota09CampaignSpawnRequestCount, 16);
  assert.ok(dakota09CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota09CampaignWaves.slice(0, 7).every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[8] === 0 && requests[9] === 0)));
  assert.deepEqual(dakota09CampaignWaves[7]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 8 has one Boss request in slot 9 and no Doc request');
  assert.deepEqual(dakota09SpawnPointIdByActionId, { 1: 0, 0: 1, 2: 2 },
    'APK action IDs map to the map’s row-major spawn point IDs');
});

test('Snow Town Wave 1 spawns from the APK action-0 route in a short GameSession', async () => {
  const scenario = scenarioWithWaves(dakota09CampaignWaves);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_940,
  });

  try {
    assert.equal(session.observe().wave?.pendingSpawnRequests, 25);
    let firstSpawn: { spawnPointId: number; requestType: number; waveNumber: number } | undefined;
    let view = session.observe();
    for (let frame = 0; frame < 240 && firstSpawn === undefined; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned' && event.waveNumber === 1) firstSpawn = event;
    }
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.waveNumber, 1);
    assert.equal(firstSpawn.spawnPointId, dakota09SpawnPointIdByActionId[0]);
    assert.equal(firstSpawn.spawnPointId, 1, 'APK action 0 maps to the second row-major spawn point');
    assert.ok([2, 3, 4, 5].includes(firstSpawn.requestType),
      'the runtime selects a non-empty ordinary pool slot without fixing spawn order');
  } finally {
    session.close();
  }
});

test('Snow Town Wave 8 Boss request dispatches through the real GameSession spawn path', async () => {
  const lastWave = dakota09CampaignWaves[7]!;
  const scenario = scenarioWithWaves([{
    ...lastWave,
    number: 1,
    delayMs: 0,
    spawnPools: lastWave.spawnPools.map((pool) => ({ ...pool, intervalMs: 0 })),
  }]);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_941,
  });

  try {
    let spawn: { spawnPointId: number; requestType: number; groupSize: number } | undefined;
    for (let frame = 0; frame < 4 && spawn === undefined; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned') spawn = event;
    }
    assert.ok(spawn);
    assert.deepEqual({
      spawnPointId: spawn.spawnPointId,
      requestType: spawn.requestType,
      groupSize: spawn.groupSize,
    }, { spawnPointId: dakota09SpawnPointIdByActionId[2], requestType: 7, groupSize: 1 });
  } finally {
    session.close();
  }
});
