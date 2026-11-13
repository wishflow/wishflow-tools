import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-05.json';
import {
  oregon05BaseEnemy,
  oregon05BonusCratePool,
  oregon05CampaignAwesomeEnemyTypeThreshold,
  oregon05EnemyByType,
  oregon05MaxUpgrades,
  oregon05PreviewWave,
} from '../src/content/oregon-05-campaign-rules';
import { oregon05CampaignWaves } from '../src/content/oregon-05-campaign-waves';
import { createOregon05Dynamite } from '../src/content/oregon-05-dynamite';
import { createOregon05MapContent } from '../src/content/oregon-05-map-entities';
import { oregon05CampaignUnitPool } from '../src/content/oregon-05-unit-pool';
import { oregon05RouteDefinitions, oregon05SpawnPointIdByActionId } from '../src/content/oregon-05-routes';
import {
  advanceCampaignUnitPool,
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
  queueCampaignUnitForSpawn,
} from '../src/game/campaign-unit-pool';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedPool {
  actionId: number;
  intervalMs: number;
  counts: readonly number[];
  bossCount?: number;
}

interface ExpectedWave {
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  pools: readonly ExpectedPool[];
}

const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 3_000, hitPointMultiplierPercent: 50, speedMultiplierPercent: 100,
    pools: [{ actionId: 2, intervalMs: 1_000, counts: [0, 0, 0, 0, 0, 0, 0, 1] }] },
  { delayMs: 5_000, hitPointMultiplierPercent: 50, speedMultiplierPercent: 105,
    pools: [
      { actionId: 1, intervalMs: 1_000, counts: [0, 0, 0, 0, 0, 0, 0, 1] },
      { actionId: 3, intervalMs: 5_000, counts: [0, 0, 0, 0, 0, 0, 0, 1] },
    ] },
  { delayMs: 10_000, hitPointMultiplierPercent: 80, speedMultiplierPercent: 110,
    pools: [
      { actionId: 2, intervalMs: 2_000, counts: [1, 1, 1, 1, 2, 0, 1, 0] },
      { actionId: 3, intervalMs: 2_000, counts: [1, 1, 2, 1, 2, 1, 0, 0] },
    ] },
  { delayMs: 10_000, hitPointMultiplierPercent: 85, speedMultiplierPercent: 115,
    pools: [
      { actionId: 0, intervalMs: 2_000, counts: [1, 1, 1, 1, 2, 0, 1, 0] },
      { actionId: 1, intervalMs: 2_000, counts: [1, 1, 2, 1, 2, 1, 0, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 90, speedMultiplierPercent: 120,
    pools: [0, 1, 2].map((actionId) => ({
      actionId, intervalMs: 2_500, counts: [0, 0, 0, 0, 0, 0, 0, 1],
    })) },
  { delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 125,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 0, 0, 0, 6, 0, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 0, 0, 7, 0, 0, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 0, 0, 0, 7, 0, 0, 0] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 0, 0, 6, 0, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 105, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 1, 4, 3, 0, 0, 0, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 1, 4, 3, 0, 0, 0, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 1, 4, 3, 0, 0, 0, 0] },
      { actionId: 3, intervalMs: 2_500, counts: [1, 1, 3, 3, 0, 0, 0, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 105, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: 3_500, counts: [2, 3, 1, 1, 4, 2, 0, 0] },
      { actionId: 1, intervalMs: 3_500, counts: [2, 2, 0, 3, 4, 2, 1, 0] },
      { actionId: 2, intervalMs: 3_500, counts: [2, 1, 2, 3, 4, 2, 0, 0] },
      { actionId: 3, intervalMs: 3_500, counts: [1, 2, 1, 3, 4, 2, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 140,
    pools: [{ actionId: 0, intervalMs: 3_000, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
    spawnPools: pools.map(({ actionId, intervalMs, counts, bossCount = 0 }) => {
      const spawnPointId = oregon05SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a route`);
      return [spawnPointId, intervalMs, [...counts, 0, bossCount]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon05MapContent(() => true);
  return {
    id: 'dynamite-plains-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Dynamite Plains', zh: '炸药平原' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon05MaxUpgrades,
    previewWave: oregon05PreviewWave,
    campaignWaveCount: oregon05CampaignWaves.length,
    campaignWaves: oregon05CampaignWaves,
    campaignUnitPool: oregon05CampaignUnitPool,
    campaignBonusCratePool: oregon05BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon05CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon05BaseEnemy,
    campaignEnemyByType: oregon05EnemyByType,
    dynamite: createOregon05Dynamite([]),
  };
}

test('Dynamite Plains initial parameters and all 23 APK spawn requests match the static audit', () => {
  assert.equal(oregon05MaxUpgrades, 3);
  assert.equal(oregon05PreviewWave.initialCash, 65);
  assert.equal(oregon05PreviewWave.initialLives, 1);
  assert.deepEqual(oregon05PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 140,
  });
  assert.deepEqual(oregon05BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon05CampaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(new Set(oregon05RouteDefinitions.map(({ spawn }) => `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`)).size, 4);
  assert.deepEqual(Object.keys(oregon05SpawnPointIdByActionId).map(Number).sort(), [0, 1, 2, 3]);
  assert.deepEqual(oregon05CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon05CampaignWaves.length, 9);
  assert.equal(oregon05CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 23);
  assert.ok(oregon05CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.deepEqual(oregon05CampaignWaves[8]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    'Wave 9 puts its single Boss in the final request slot');
  assert.equal(createRulesScenario().gambler, undefined, 'Dynamite Plains has no Gambler marker');
});

test('Dynamite Plains opens at one life and its deterministic Wave 1 request scales by difficulty', async () => {
  const expectedGoldTransportHitPoints = { easy: 2_150, medium: 2_850, hard: 3_500 } as const;

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const scenario = createRulesScenario();
    const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
      scenarioId: scenario.id,
      mode: 'free',
      difficulty,
      randomSeed: 2828,
    });

    try {
      let view = session.observe();
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 9);
      assert.equal(view.wave?.cash, 65);
      assert.equal(view.wave?.lives, 1);
      assert.equal(view.wave?.maxLives, 1);
      assert.equal(view.bonusCratePool?.remainingCount, 999);
      assert.equal(view.bonusCratePool?.remainingMs, 25_000);

      for (let frame = 0; frame < 100 && !view.events.some(({ type }) => type === 'enemy-group-spawned'); frame += 1) {
        view = session.advance({ deltaMs: 100 });
      }

      const firstSpawn = view.events.find(({ type }) => type === 'enemy-group-spawned');
      assert.ok(firstSpawn && firstSpawn.type === 'enemy-group-spawned', 'Wave 1 releases its requested enemy group');
      assert.equal(firstSpawn.requestType, 6, 'request slot 8 resolves to the APK Gold Transport type');
      const goldTransport = view.enemies.find(({ type }) => type === 6);
      assert.ok(goldTransport, 'the first request creates a Gold Transport');
      assert.equal(goldTransport.maxHitPoints, expectedGoldTransportHitPoints[difficulty]);
    } finally {
      session.close();
    }
  }
});

test('a single escaped Gold Transport produces a formal defeat settlement at the one-life limit', async () => {
  const scenario = createRulesScenario();
  const firstWave = oregon05CampaignWaves[0]!;
  const defeatScenario: ScenarioContent = {
    ...scenario,
    id: 'dynamite-plains-one-life-defeat-test',
    units: [],
    campaignUnitPool: undefined,
    campaignWaveCount: 1,
    campaignWaves: [{
      ...firstWave,
      delayMs: 0,
      speedMultiplierPercent: 1_000,
    }],
  };
  const session = await createGame({ scenarios: { [defeatScenario.id]: defeatScenario } }).open({
    scenarioId: defeatScenario.id,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 2525,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 300 && !session.terminalRecord(); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }

    const terminal = session.terminalRecord();
    assert.ok(terminal, 'the one-life scenario settles when its requested Gold Transport escapes');
    assert.equal(terminal.mode, 'formal');
    assert.equal(terminal.outcome, 'defeat');
    assert.equal(view.wave?.lives, 0);
    assert.equal(view.wave?.settlement?.outcome, 'defeat');
    assert.equal(view.events.filter(({ type }) => type === 'wave-settled').length, 1);
  } finally {
    session.close();
  }
});

test('Dynamite Plains Wave 1 pool actions cap only Saloon and Tipi units, without a Cannon spawn point', () => {
  const pool = oregon05CampaignUnitPool;
  const spawnLocations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 112 || code === 114 ? [{ code, x, y }] : []
  )));
  assert.deepEqual(spawnLocations, [
    { code: 112, x: 2, y: 2 },
    { code: 114, x: 29, y: 2 },
  ]);
  assert.deepEqual(pool.spawnLocations.map(({ spawnLocationType, cell }) => [spawnLocationType, cell]), [
    [1, { x: 2, y: 2 }],
    [3, { x: 29, y: 2 }],
  ]);
  assert.deepEqual(pool.units.map(({ poolType, unitType, spawnLocationType }) => [poolType, unitType, spawnLocationType]), [
    [1, 'gunslinger', 1],
    [2, 'mexican', 1],
    [4, 'indian', 3],
  ]);
  assert.ok(pool.units.every(({ unitType }) => unitType !== 'cannon'));
  assert.ok(pool.spawnLocations.every(({ spawnLocationType }) => spawnLocationType !== 2));
  assert.deepEqual(pool.actions, [
    { waveNumber: 1, action: 'set', values: [
      { poolType: 1, count: 0 }, { poolType: 2, count: 0 }, { poolType: 4, count: 0 },
    ] },
    { waveNumber: 1, action: 'set-max', values: [
      { poolType: 1, count: 3 }, { poolType: 2, count: 3 }, { poolType: 4, count: 3 },
    ] },
  ]);

  const runtime = createCampaignUnitPoolRuntime(pool)!;
  applyCampaignUnitPoolActions(runtime, pool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'Wave 1 SET clears every current pool');
  assert.deepEqual(runtime.maximum.slice(1, 5), [3, 3, 0, 3], 'Cannon has the audited zero cap without a fake Fort');
});

test('Dynamite Plains hired pool types spawn at their corresponding real buildings', () => {
  const random = { nextInt: (_bound: number) => 0 };
  const cases = [
    { unitType: 'gunslinger', expectedCell: { x: 2, y: 2 } },
    { unitType: 'mexican', expectedCell: { x: 2, y: 2 } },
    { unitType: 'indian', expectedCell: { x: 29, y: 2 } },
  ] as const;

  for (const { unitType, expectedCell } of cases) {
    const runtime = createCampaignUnitPoolRuntime(oregon05CampaignUnitPool)!;
    applyCampaignUnitPoolActions(runtime, oregon05CampaignUnitPool, 1);
    queueCampaignUnitForSpawn(runtime, oregon05CampaignUnitPool, unitType);
    advanceCampaignUnitPool(runtime, oregon05CampaignUnitPool, 15_001, random, () => false);
    const spawned = advanceCampaignUnitPool(runtime, oregon05CampaignUnitPool, 1_001, random, () => false);
    assert.equal(spawned.length, 1, `${unitType} is dispatched once the pool and building timers expire`);
    assert.deepEqual(spawned[0]?.cell, expectedCell);
    assert.equal(spawned[0]?.unitType, unitType);
  }
});

test('a hired Dynamite Plains Gunslinger is dispatched through GameSession to the Saloon', async () => {
  const scenario = createRulesScenario();
  const sessionScenario: ScenarioContent = {
    ...scenario,
    id: 'dynamite-plains-saloon-session-test',
    previewWave: { ...oregon05PreviewWave, initialCash: 500 },
  };
  const session = await createGame({ scenarios: { [sessionScenario.id]: sessionScenario } }).open({
    scenarioId: sessionScenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2526,
  });

  try {
    const hire = session.observe().units.find(({ type, activity }) => type === 'gunslinger' && activity === 4);
    assert.ok(hire, 'Dynamite Plains has a TDM-backed hireable Gunslinger');
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'dynamite-plains-gunslinger-hire' }), true);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.events.some((event) => event.type === 'map-unit-hired' && event.unitType === 'gunslinger'));

    for (let frame = 0; frame < 170 && !view.units.some(({ id }) => id === 'gunslinger-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'gunslinger-spawn-01');
    assert.ok(spawned, 'the hired unit dispatches through the original player pool');
    assert.equal(spawned.type, 'gunslinger');
    assert.equal(spawned.activity, 2);
    assert.deepEqual(spawned.cell, { x: 2, y: 2 });
  } finally {
    session.close();
  }
});
