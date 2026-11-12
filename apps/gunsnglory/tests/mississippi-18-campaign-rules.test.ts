import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/mississippi-18.json';
import { createMississippi18MapScene } from '../src/content/mississippi-18-scene';
import { createMississippi18MapUnits } from '../src/content/mississippi-18-units';
import {
  mississippi18BonusCratePool,
  mississippi18CampaignAwesomeEnemyTypeThreshold,
  mississippi18BaseEnemy,
  mississippi18EnemyByType,
  mississippi18MaxUpgrades,
  mississippi18PreviewWave,
} from '../src/content/mississippi-18-campaign-rules';
import { mississippi18CampaignWaves } from '../src/content/mississippi-18-campaign-waves';
import { mississippi18RouteDefinitions, mississippi18SpawnPointIdByActionId } from '../src/content/mississippi-18-routes';
import { mississippi18CampaignUnitPool } from '../src/content/mississippi-18-unit-pool';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100, spawnPools: [[1, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [2, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 105, spawnPools: [[1, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [2, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 100, spawnPools: [[1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [2, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 4, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 115, spawnPools: [[1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [2, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 5, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110, spawnPools: [[1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [2, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [5, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 150, spawnPools: [[1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [2, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [5, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110, spawnPools: [[1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [2, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [5, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 8, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110, spawnPools: [[1, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [2, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [3, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [4, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [0, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [5, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]]] },
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

function createRulesScenario(): ScenarioContent {
  return {
    id: 'shadow-town-rule-test',
    formalSettlementSupported: true,
    title: { en: 'Shadow Town', zh: '影镇' },
    map: createMississippi18MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi18MapUnits(),
    maxUpgrades: mississippi18MaxUpgrades,
    previewWave: mississippi18PreviewWave,
    campaignWaveCount: mississippi18CampaignWaves.length,
    campaignWaves: mississippi18CampaignWaves,
    campaignUnitPool: mississippi18CampaignUnitPool,
    campaignBonusCratePool: mississippi18BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi18CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi18BaseEnemy,
    campaignEnemyByType: mississippi18EnemyByType,
  };
}

test('Shadow Town matches the APK start state, route mapping, and all eight wave request tables', () => {
  assert.equal(mississippi18MaxUpgrades, 3);
  assert.equal(mississippi18PreviewWave.initialCash, 425);
  assert.equal(mississippi18PreviewWave.initialLives, 20);
  assert.deepEqual(mississippi18PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 100, hard: 110,
  });
  assert.deepEqual(mississippi18BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 16, rewardTypeCount: 4,
  });
  assert.equal(mississippi18RouteDefinitions.length, 15);
  assert.equal((mississippi18PreviewWave.additionalSpawns?.length ?? 0) + 1, 6);
  assert.deepEqual(mississippi18SpawnPointIdByActionId, { 4: 0, 0: 1, 1: 2, 2: 3, 3: 4, 5: 5 });
  assert.deepEqual(mississippi18PreviewWave.routes, mississippi18RouteDefinitions);
  assert.deepEqual(mississippi18CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi18CampaignWaves.length, 8);
  assert.equal(mississippi18CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 37);
  assert.ok(mississippi18CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('Shadow Town wave one opens with twenty requests and no placed Cannon', async () => {
  const scenario = createRulesScenario();
  assert.ok(!scenario.units.some(({ type }) => type === 'cannon'));
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1801,
  });
  try {
    const view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.pendingSpawnRequests, 20);
    assert.equal(view.wave?.cash, 425);
    assert.equal(view.wave?.lives, 20);
  } finally {
    session.close();
  }
});

test('Shadow Town wave-two pool actions queue the APK counts and limits for both Saloons and Fort', () => {
  assert.deepEqual(mississippi18CampaignUnitPool.spawnLocations, [
    { id: 'saloon-13-7', spawnLocationType: 1, cell: { x: 13, y: 7 } },
    { id: 'fort-20-8', spawnLocationType: 2, cell: { x: 20, y: 8 } },
    { id: 'saloon-17-13', spawnLocationType: 1, cell: { x: 17, y: 13 } },
  ]);
  assert.deepEqual(mississippi18CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => [
    poolType, unitType, spawnLocationType, template?.type,
  ]), [
    [1, 'gunslinger', 1, undefined],
    [2, 'mexican', 1, 'mexican'],
    [3, 'cannon', 2, 'cannon'],
  ]);
  assert.equal(mississippi18CampaignUnitPool.intervalMs, 15_000);

  const runtime = createCampaignUnitPoolRuntime(mississippi18CampaignUnitPool)!;
  applyCampaignUnitPoolActions(runtime, mississippi18CampaignUnitPool, 2);
  assert.deepEqual(runtime.pending.slice(1, 4), [2, 2, 1]);
  assert.deepEqual(runtime.maximum.slice(1, 4), [6, 4, 2]);
  assert.equal(runtime.pending.filter((count) => count > 0).length, 3);
  assert.equal(runtime.maximum.filter((count) => count > 0).length, 3);
});

test('Shadow Town GameSession transitions to wave two and spawns only from its real map locations', async () => {
  const scenario = createRulesScenario();
  const emptyFirstWave: CampaignWaveDefinition = {
    ...mississippi18CampaignWaves[0]!,
    delayMs: 0,
    spawnPools: [],
  };
  scenario.campaignWaves = [emptyFirstWave, ...mississippi18CampaignWaves.slice(1)];
  scenario.campaignUnitPool = { ...mississippi18CampaignUnitPool, intervalMs: 100 };

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1802,
  });
  try {
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.wave?.number, 2);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.phase, 'active');

    for (let frame = 0; frame < 80 && !view.units.some(({ id }) => id.endsWith('-spawn-01')); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id.endsWith('-spawn-01'));
    assert.ok(spawned, 'the wave-two pool should generate its first active unit');
    if (spawned.type === 'cannon') {
      assert.deepEqual(spawned.cell, { x: 20, y: 8 });
      assert.equal(spawned.asset, 'player_cannon');
    } else {
      assert.ok(['gunslinger', 'mexican'].includes(spawned.type));
      assert.ok(mississippi18CampaignUnitPool.spawnLocations
        .filter(({ spawnLocationType }) => spawnLocationType === 1)
        .some(({ cell }) => cell.x === spawned.cell.x && cell.y === spawned.cell.y));
    }
    assert.equal(spawned.activity, 2);
  } finally {
    session.close();
  }
});

test('Shadow Town pool-only Cannon template becomes a live unit at the Fort', async () => {
  const scenario = createRulesScenario();
  const fort = mississippi18CampaignUnitPool.spawnLocations.find(({ spawnLocationType }) => spawnLocationType === 2)!;
  const cannon = mississippi18CampaignUnitPool.units.find(({ poolType }) => poolType === 3)!;
  scenario.campaignWaves = [
    { ...mississippi18CampaignWaves[0]!, delayMs: 0, spawnPools: [] },
    ...mississippi18CampaignWaves.slice(1),
  ];
  scenario.campaignUnitPool = {
    intervalMs: 100,
    units: [cannon],
    spawnLocations: [fort],
    actions: [
      { waveNumber: 2, action: 'set', values: [{ poolType: 3, count: 1 }] },
      { waveNumber: 2, action: 'set-max', values: [{ poolType: 3, count: 2 }] },
    ],
  };

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1803,
  });
  try {
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.wave?.number, 2);
    for (let frame = 0; frame < 40 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'the pool template should create an active Cannon, not a placed map unit');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.asset, 'player_cannon');
    assert.equal(spawned.activity, 2);
    assert.deepEqual(spawned.cell, fort.cell);
  } finally {
    session.close();
  }
});
