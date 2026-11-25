import assert from 'node:assert/strict';
import test from 'node:test';
import { createDakota09CampaignContent } from '../src/content/dakota-09-campaign';
import { nevada01CampaignSpawnRequestCount, nevada01CampaignWaves } from '../src/content/nevada-01-campaign-waves';
import { nevada01LevelParameters } from '../src/content/nevada-01-campaign-rules';
import { createNevada01MapScene } from '../src/content/nevada-01-scene';
import { nevada01RouteDefinitions, nevada01SpawnPointIdByActionId } from '../src/content/nevada-01-routes';
import { createNevada01MapUnits } from '../src/content/nevada-01-units';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedPool {
  actionId: number;
  intervalMs: number;
  counts: readonly number[];
  bossCount?: number;
  docCount?: number;
}

interface ExpectedWave {
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  pools: readonly ExpectedPool[];
}

// Independent source-call transcription from GameDesignWaves.setWaves(i == 41).
const expectedSourceCallCountByWave = [2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 3] as const;
const expectedWaveRows: readonly ExpectedWave[] = [
  { hitPointMultiplierPercent: 100, speedMultiplierPercent: 100, pools: [
    { actionId: 0, intervalMs: 3_000, counts: [2, 3, 4, 3, 3, 2, 0, 0] },
    { actionId: 1, intervalMs: 3_000, counts: [2, 3, 4, 3, 3, 2, 0, 0] },
  ] },
  { hitPointMultiplierPercent: 115, speedMultiplierPercent: 110, pools: [
    { actionId: 0, intervalMs: 3_000, counts: [1, 1, 4, 5, 3, 2, 0, 0] },
    { actionId: 1, intervalMs: 3_000, counts: [1, 3, 4, 5, 3, 2, 1, 0] },
  ] },
  { hitPointMultiplierPercent: 120, speedMultiplierPercent: 115, pools: [
    { actionId: 0, intervalMs: 2_500, counts: [1, 1, 1, 3, 4, 2, 1, 0] },
    { actionId: 1, intervalMs: 2_500, counts: [1, 1, 1, 3, 4, 1, 2, 0] },
    { actionId: 2, intervalMs: 2_500, counts: [1, 0, 1, 3, 5, 2, 0, 0] },
  ] },
  { hitPointMultiplierPercent: 130, speedMultiplierPercent: 120, pools: [
    { actionId: 0, intervalMs: 2_000, counts: [0, 1, 2, 3, 2, 2, 1, 0] },
    { actionId: 1, intervalMs: 2_000, counts: [0, 1, 2, 3, 2, 3, 1, 1] },
    { actionId: 2, intervalMs: 2_000, counts: [0, 0, 1, 3, 3, 2, 1, 0] },
  ] },
  { hitPointMultiplierPercent: 150, speedMultiplierPercent: 130, pools: [
    { actionId: 0, intervalMs: 2_500, counts: [0, 0, 1, 2, 1, 2, 1, 0] },
    { actionId: 1, intervalMs: 2_500, counts: [0, 0, 1, 2, 1, 4, 1, 0] },
    { actionId: 2, intervalMs: 2_500, counts: [0, 0, 1, 2, 1, 2, 1, 0] },
    { actionId: 3, intervalMs: 2_500, counts: [0, 0, 2, 2, 1, 2, 1, 0] },
  ] },
  { hitPointMultiplierPercent: 170, speedMultiplierPercent: 140, pools: [
    { actionId: 0, intervalMs: 2_500, counts: [0, 0, 2, 3, 1, 2, 2, 0] },
    { actionId: 1, intervalMs: 2_500, counts: [0, 0, 2, 3, 1, 3, 2, 0] },
    { actionId: 2, intervalMs: 2_500, counts: [0, 0, 2, 3, 1, 3, 1, 0] },
    { actionId: 3, intervalMs: 2_500, counts: [0, 0, 2, 3, 1, 3, 1, 0] },
  ] },
  { hitPointMultiplierPercent: 190, speedMultiplierPercent: 145, pools: [
    { actionId: 0, intervalMs: 2_250, counts: [0, 0, 1, 2, 2, 2, 1, 0] },
    { actionId: 1, intervalMs: 2_250, counts: [0, 0, 1, 2, 2, 3, 2, 1] },
    { actionId: 2, intervalMs: 2_250, counts: [0, 0, 1, 2, 2, 2, 2, 0] },
    { actionId: 3, intervalMs: 2_250, counts: [0, 0, 2, 2, 2, 2, 1, 0] },
  ] },
  { hitPointMultiplierPercent: 230, speedMultiplierPercent: 150, pools: [
    { actionId: 0, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 1, 0, 2] },
    { actionId: 1, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 0, 1, 1] },
    { actionId: 2, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 1, 0, 1] },
    { actionId: 3, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 0, 1, 1] },
  ] },
  { hitPointMultiplierPercent: 250, speedMultiplierPercent: 155, pools: [
    { actionId: 0, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 2, 2, 1] },
    { actionId: 1, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 2, 1, 1] },
    { actionId: 2, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 2, 2, 1] },
    { actionId: 3, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 2, 2, 0] },
  ] },
  { hitPointMultiplierPercent: 260, speedMultiplierPercent: 160, pools: [
    { actionId: 0, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 2, 2, 0] },
    { actionId: 1, intervalMs: 2_000, counts: [0, 0, 0, 1, 1, 2, 2, 1] },
    { actionId: 2, intervalMs: 2_000, counts: [0, 0, 0, 1, 2, 2, 2, 1] },
    { actionId: 3, intervalMs: 2_000, counts: [0, 0, 0, 1, 1, 2, 2, 1] },
  ] },
  { hitPointMultiplierPercent: 270, speedMultiplierPercent: 150, pools: [
    { actionId: 0, intervalMs: 2_000, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 },
    { actionId: 2, intervalMs: 2_000, counts: [0, 0, 0, 1, 0, 0, 0, 1] },
    { actionId: 3, intervalMs: 2_000, counts: [0, 0, 0, 1, 0, 0, 0, 1] },
  ] },
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
  return expectedWaveRows.map(({ hitPointMultiplierPercent, speedMultiplierPercent, pools }, index) => ({
    number: index + 1,
    delayMs: 15_000,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: pools.map(({ actionId, intervalMs, counts, bossCount = 0, docCount = 0 }) => (
      [nevada01SpawnPointIdByActionId[actionId], intervalMs, [...counts, bossCount, docCount]] as const
    )),
  }));
}

function scenarioWithWaves(campaignWaves: readonly CampaignWaveDefinition[]): ScenarioContent {
  const base = createDakota09CampaignContent();
  const routes = nevada01RouteDefinitions;
  const uniqueSpawns = [...new Map(routes.map(({ spawn }) => [
    `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
  ])).values()];
  const uniqueExits = [...new Map(routes.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];
  const firstRoute = routes[0]!;
  const previewWave = {
    ...base.previewWave!,
    number: 1,
    initialLives: nevada01LevelParameters.initialLives,
    initialCash: nevada01LevelParameters.initialCash,
    spawn: uniqueSpawns[0]!,
    additionalSpawns: uniqueSpawns.slice(1),
    routes,
    redirects: firstRoute.redirects,
    exit: firstRoute.exit,
    additionalExits: uniqueExits.slice(1),
  };

  return {
    ...base,
    id: 'nevada-01-campaign-wave-test',
    map: createNevada01MapScene(),
    originalTileGrid: createNevada01MapScene().originalTileGrid,
    units: createNevada01MapUnits(),
    previewWave,
    campaignWaveCount: campaignWaves.length,
    campaignWaves,
  };
}

test('Labyrinth Gulch preserves 11 APK waves and all 37 action rows with source route mapping', () => {
  assert.deepEqual(nevada01CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(nevada01CampaignWaves.length, 11);
  assert.equal(expectedSourceCallCountByWave.reduce((sum, count) => sum + count, 0), 37);
  assert.equal(nevada01CampaignSpawnRequestCount, 37);
  assert.deepEqual(nevada01SpawnPointIdByActionId, { 2: 0, 0: 1, 1: 2, 3: 3 });
  assert.ok(nevada01CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(nevada01CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)),
    'the APK does not request Docs in this level');
  assert.deepEqual(nevada01CampaignWaves[10]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 11 routes one Boss from action 0');
});

test('Wave 1 action pools dispatch through the matching Labyrinth Gulch spawn points', async () => {
  const sourceWave = nevada01CampaignWaves[0]!;
  for (const actionId of [0, 1]) {
    const sourcePool = sourceWave.spawnPools.find((pool) => pool.spawnPointId === nevada01SpawnPointIdByActionId[actionId]);
    assert.ok(sourcePool);
    const scenario = scenarioWithWaves([{
      ...sourceWave,
      delayMs: 0,
      spawnPools: [{ ...sourcePool, intervalMs: 0 }],
    }]);
    const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
      scenarioId: scenario.id,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 41_000 + actionId,
    });

    try {
      let spawn: { spawnPointId: number } | undefined;
      for (let frame = 0; frame < 10 && !spawn; frame += 1) {
        const view = session.advance({ deltaMs: 100 });
        const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
        if (event?.type === 'enemy-group-spawned') spawn = event;
      }
      assert.ok(spawn, `action ${actionId} dispatches an enemy`);
      assert.equal(spawn.spawnPointId, nevada01SpawnPointIdByActionId[actionId]);
    } finally {
      session.close();
    }
  }
});

test('Wave 5 dispatches across all four source routes in one real session', async () => {
  const sourceWave = nevada01CampaignWaves[4]!;
  const scenario = scenarioWithWaves([{
    ...sourceWave,
    number: 1,
    delayMs: 0,
    spawnPools: sourceWave.spawnPools.map((pool) => ({ ...pool, intervalMs: 0 })),
  }]);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 41_005,
  });

  try {
    const dispatched = new Set<number>();
    for (let frame = 0; frame < 5 && dispatched.size < 4; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      for (const event of view.events) {
        if (event.type === 'enemy-group-spawned' && event.waveNumber === 1) dispatched.add(event.spawnPointId);
      }
    }
    assert.deepEqual([...dispatched].sort(), [
      nevada01SpawnPointIdByActionId[0],
      nevada01SpawnPointIdByActionId[1],
      nevada01SpawnPointIdByActionId[2],
      nevada01SpawnPointIdByActionId[3],
    ].sort());
  } finally {
    session.close();
  }
});

test('Wave 11 routes its Boss request through the actual GameSession spawn path', async () => {
  const sourceWave = nevada01CampaignWaves[10]!;
  const bossPool = sourceWave.spawnPools[0]!;
  const scenario = scenarioWithWaves([{
    ...sourceWave,
    number: 1,
    delayMs: 0,
    spawnPools: [{ ...bossPool, intervalMs: 0 }],
  }]);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 41_011,
  });

  try {
    let spawn: { spawnPointId: number; requestType: number; groupSize: number } | undefined;
    for (let frame = 0; frame < 10 && !spawn; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned') spawn = event;
    }
    assert.ok(spawn);
    assert.deepEqual({
      spawnPointId: spawn.spawnPointId,
      requestType: spawn.requestType,
      groupSize: spawn.groupSize,
    }, {
      spawnPointId: nevada01SpawnPointIdByActionId[0],
      requestType: 7,
      groupSize: 1,
    });
    assert.ok(session.observe().enemies.some((enemy) => enemy.asset === 'boss'));
  } finally {
    session.close();
  }
});
