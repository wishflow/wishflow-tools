import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-10.json';
import { createOregon10DynamiteFromUnlock } from '../src/content/oregon-10-dynamite';
import { createOregon10MapContent } from '../src/content/oregon-10-map-entities';
import {
  oregon10BaseEnemy,
  oregon10BonusCratePool,
  oregon10CampaignAwesomeEnemyTypeThreshold,
  oregon10EnemyByType,
  oregon10MaxUpgrades,
  oregon10PreviewWave,
} from '../src/content/oregon-10-campaign-rules';
import { oregon10CampaignUnitPool } from '../src/content/oregon-10-unit-pool';
import { oregon10CampaignWaves } from '../src/content/oregon-10-campaign-waves';
import { oregon10RouteDefinitions, oregon10SpawnPointIdByActionId } from '../src/content/oregon-10-routes';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';
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

// Independent expected values transcribed from the map33 level-30 Smali branch.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 120,
    pools: [{ actionId: 2, intervalMs: 2_000, counts: [2, 2, 2, 3, 2, 3, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 125,
    pools: [{ actionId: 2, intervalMs: 2_000, counts: [2, 2, 2, 3, 2, 3, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 125,
    pools: [
      { actionId: 2, intervalMs: 2_500, counts: [3, 3, 2, 3, 2, 3, 1, 0] },
      { actionId: 3, intervalMs: 3_000, counts: [3, 3, 1, 1, 3, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 130,
    pools: [
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 2, 3, 2, 2, 1, 0] },
      { actionId: 3, intervalMs: 2_500, counts: [1, 2, 1, 1, 3, 2, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    pools: [{ actionId: 1, intervalMs: 2_500, counts: [1, 2, 2, 3, 2, 3, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 3, 3, 2, 2, 2, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 2, 3, 2, 2, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 3, 3, 3, 2, 1, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 2, 3, 3, 2, 1, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 3, 3, 3, 3, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 2, 3, 3, 3, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 2, 3, 3, 3, 2, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 1, 2, 4, 4, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 1, 2, 4, 4, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 1, 2, 4, 4, 3, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 1, 2, 4, 4, 2, 1] },
    ] },
  { delayMs: 30_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 120,
    pools: [
      { actionId: 1, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 },
      { actionId: 2, intervalMs: 5_000, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 },
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
  return expectedWaveRows.map(({ delayMs, hitPointMultiplierPercent, speedMultiplierPercent, pools }, index) => ({
    number: index + 1,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: pools.map(({ actionId, intervalMs, counts, bossCount = 0 }) => {
      const spawnPointId = oregon10SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a TDM route`);
      return [spawnPointId, intervalMs, [...counts, bossCount, 0]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon10MapContent(() => true);
  return {
    id: 'lumber-mill-hills-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Lumber Mill Hills', zh: '木材厂山岭' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon10MaxUpgrades,
    previewWave: oregon10PreviewWave,
    campaignWaveCount: oregon10CampaignWaves.length,
    campaignWaves: oregon10CampaignWaves,
    campaignUnitPool: oregon10CampaignUnitPool,
    campaignBonusCratePool: oregon10BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon10CampaignAwesomeEnemyTypeThreshold,
    dynamite: createOregon10DynamiteFromUnlock(false),
    campaignEnemy: oregon10BaseEnemy,
    campaignEnemyByType: oregon10EnemyByType,
  };
}

test('Lumber Mill Hills parameters and all source-ordered wave data match the independent Smali audit', () => {
  assert.equal(oregon10MaxUpgrades, 3);
  assert.equal(oregon10PreviewWave.initialCash, 400);
  assert.equal(oregon10PreviewWave.initialLives, 25);
  assert.deepEqual(oregon10PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 175,
  });
  assert.deepEqual(oregon10BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon10CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon10PreviewWave.routes, oregon10RouteDefinitions);
  assert.deepEqual(Object.keys(oregon10SpawnPointIdByActionId).map(Number).sort(), [0, 1, 2, 3]);
  assert.deepEqual(oregon10CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon10CampaignWaves.length, 10);
  assert.equal(oregon10CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 20);
  assert.ok(oregon10CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.deepEqual(oregon10CampaignWaves[9]?.spawnPools.map(({ requests }) => requests), [
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  ], 'both final-wave Boss requests use APK slot 10/request index 8');

  const scenario = createRulesScenario();
  assert.equal(scenario.gambler, undefined, 'a nonzero Gambler cooldown does not create a Gambler without a map marker');
  assert.deepEqual(oregon10CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType }) => [
    poolType, unitType, spawnLocationType,
  ]), [
    [1, 'gunslinger', 1], [2, 'mexican', 1], [3, 'cannon', 2], [4, 'indian', 3],
  ]);
  assert.deepEqual(oregon10CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => [
    id, spawnLocationType, cell,
  ]), [
    ['tipi-13-1', 3, { x: 13, y: 1 }],
    ['fort-3-10', 2, { x: 3, y: 10 }],
    ['saloon-23-10', 1, { x: 23, y: 10 }],
  ]);
  assert.deepEqual(map.originalTileGrid.flat().filter((code) => code >= 112 && code <= 114).sort(), [112, 113, 114]);
});

test('Lumber Mill Hills Wave 1 applies zero stock and a six-unit cap to pool types 1–4', () => {
  const runtime = createCampaignUnitPoolRuntime(oregon10CampaignUnitPool)!;
  applyCampaignUnitPoolActions(runtime, oregon10CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'APK SET clears Wave 1 stock');
  assert.deepEqual(runtime.maximum.slice(1, 5), [6, 6, 6, 6], 'APK SET_MAX sets all four lifetime caps to six');
});

test('Lumber Mill Hills GameSession starts with APK economy and spawns a Wave 1 enemy from action 2', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 30_030,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 10);
    assert.equal(view.wave?.cash, 400);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    let firstSpawn: { spawnPointId: number; requestType: number; groupSize: number; enemyIds: readonly string[] } | undefined;
    for (let frame = 0; frame < 300 && firstSpawn === undefined; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const spawned = view.events.find((event) => event.type === 'enemy-group-spawned');
      if (spawned?.type === 'enemy-group-spawned') firstSpawn = spawned;
    }
    assert.ok(firstSpawn, 'Wave 1 request spawns during a short fixed-seed session');
    assert.equal(firstSpawn.spawnPointId, oregon10SpawnPointIdByActionId[2]);
    assert.ok([2, 3, 4, 5, 6, 7, 8].includes(firstSpawn.requestType),
      'random request selection chooses one of the non-empty Wave 1 slots');
    assert.equal(firstSpawn.enemyIds.length, firstSpawn.groupSize);
    assert.ok(view.enemies.every(({ maxHitPoints }) => maxHitPoints > 0));
  } finally {
    session.close();
  }
});

test('Lumber Mill Hills sends an actually hired Cannon from its real Fort pool location', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 30_031,
  });

  try {
    const hire = session.observe().units.find(({ type, activity }) => type === 'cannon' && activity === 4);
    assert.ok(hire, 'the TDM contains a hireable Cannon marker');
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'lumber-mill-cannon-hire' }), true);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.events.some(({ type }) => type === 'map-unit-hired'));
    assert.equal(view.wave?.cash, 250);

    for (let frame = 0; frame < 300 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'the Fort pool dispatches the hired Cannon during a short session');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_cannon');
    assert.deepEqual(spawned.cell, { x: 3, y: 10 });
  } finally {
    session.close();
  }
});

test('Lumber Mill Hills isolated final-wave request spawns the APK Boss type from slot 10', async () => {
  const scenario = createRulesScenario();
  const sourceLastWave = oregon10CampaignWaves.at(-1)!;
  const bossScenario: ScenarioContent = {
    ...scenario,
    id: 'lumber-mill-hills-boss-wave-fixture',
    campaignWaveCount: 1,
    campaignWaves: [{
      ...sourceLastWave,
      number: 1,
      delayMs: 0,
      hitPointMultiplierPercent: 100,
      speedMultiplierPercent: 100,
    }],
  };
  const session = await createGame({ scenarios: { [bossScenario.id]: bossScenario } }).open({
    scenarioId: bossScenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 30_032,
  });

  try {
    assert.equal(sourceLastWave.spawnPools[0]?.requests[8], 1);
    assert.equal(sourceLastWave.spawnPools[1]?.requests[8], 1);
    let view = session.observe();
    for (let frame = 0; frame < 30 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.ok(boss, 'the final-wave slot-10 request creates a Boss');
    assert.equal(boss.asset, 'boss');
    assert.ok(boss.maxHitPoints > 0);
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned' && event.requestType === 7));
  } finally {
    session.close();
  }
});
