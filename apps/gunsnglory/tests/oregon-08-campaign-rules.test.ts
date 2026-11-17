import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-08.json';
import {
  oregon08BonusCratePool,
  oregon08CampaignAwesomeEnemyTypeThreshold,
  oregon08BaseEnemy,
  oregon08EnemyByType,
  oregon08MaxUpgrades,
  oregon08PreviewWave,
} from '../src/content/oregon-08-campaign-rules';
import { oregon08CampaignWaves } from '../src/content/oregon-08-campaign-waves';
import { createOregon08MapContent } from '../src/content/oregon-08-map-entities';
import { oregon08CampaignUnitPool } from '../src/content/oregon-08-unit-pool';
import { oregon08RouteDefinitions, oregon08SpawnPointIdByActionId } from '../src/content/oregon-08-routes';
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

const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [4, 3, 2, 3, 2, 2, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 125,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [2, 2, 2, 3, 2, 2, 0, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [3, 2, 2, 3, 2, 2, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 2, 3, 2, 2, 0, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 0, 3, 2, 2, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 1, 2, 1, 2, 2, 2, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 135,
    pools: [{ actionId: 3, intervalMs: 2_500, counts: [3, 2, 3, 3, 3, 3, 1, 0] }] },
  { delayMs: 25_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 140,
    pools: [{ actionId: 2, intervalMs: 2_500, counts: [2, 2, 2, 2, 2, 2, 2, 0] }] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 2, 2, 2, 2, 2, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 1, 2, 2, 2, 2, 1, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 2, 2, 4, 3, 2, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 1, 2, 2, 4, 3, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 2, 2, 4, 3, 2, 0] },
      { actionId: 3, intervalMs: 2_500, counts: [2, 1, 2, 2, 4, 3, 1, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 2, 2, 4, 3, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 1, 2, 2, 4, 3, 1, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 2, 2, 4, 3, 2, 0] },
      { actionId: 3, intervalMs: 2_500, counts: [2, 1, 2, 2, 4, 3, 1, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 160,
    pools: [{ actionId: 2, intervalMs: 2_500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
      const spawnPointId = oregon08SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a route`);
      return [spawnPointId, intervalMs, [...counts, bossCount, 0]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon08MapContent(() => true);
  return {
    id: 'colt-city-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Colt City', zh: '柯尔特城' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon08MaxUpgrades,
    previewWave: oregon08PreviewWave,
    campaignWaveCount: oregon08CampaignWaves.length,
    campaignWaves: oregon08CampaignWaves,
    campaignUnitPool: oregon08CampaignUnitPool,
    campaignBonusCratePool: oregon08BonusCratePool,
    ...(mapContent.gambler ? { gambler: mapContent.gambler } : {}),
    campaignAwesomeEnemyTypeThreshold: oregon08CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon08BaseEnemy,
    campaignEnemyByType: oregon08EnemyByType,
  };
}

test('Colt City initial economy, difficulty, and all 19 source-ordered wave pools match APK data', () => {
  assert.equal(oregon08MaxUpgrades, 3);
  assert.equal(oregon08PreviewWave.initialCash, 600);
  assert.equal(oregon08PreviewWave.initialLives, 25);
  assert.deepEqual(oregon08PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 175,
  });
  assert.deepEqual(oregon08BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon08CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon08PreviewWave.routes, oregon08RouteDefinitions);
  assert.deepEqual(Object.keys(oregon08SpawnPointIdByActionId).map(Number).sort(), [0, 1, 2, 3]);
  assert.deepEqual(oregon08CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon08CampaignWaves.length, 9);
  assert.equal(oregon08CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 19);
  assert.ok(oregon08CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.deepEqual(oregon08CampaignWaves[8]?.spawnPools[0]?.requests, [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    'the final wave keeps its Boss in APK slot 10/request index 8');
});

test('Colt City Wave 1 clears all four player pools and gives each a three-unit lifetime cap', () => {
  const runtime = createCampaignUnitPoolRuntime(oregon08CampaignUnitPool)!;
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 0, 0]);
  applyCampaignUnitPoolActions(runtime, oregon08CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'APK SET clears Wave 1 stock');
  assert.deepEqual(runtime.maximum.slice(1, 5), [3, 3, 3, 3], 'APK SET_MAX applies to pool types 1–4');
});

test('Colt City GameSession starts at APK economy and spawns a Wave 1 enemy on its mapped route', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 28028,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.cash, 600);
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
    assert.ok(firstSpawn, 'the configured Wave 1 request creates a group in a short fixed-seed session');
    assert.equal(firstSpawn.spawnPointId, oregon08SpawnPointIdByActionId[1]);
    assert.ok([2, 3, 4, 5, 6].includes(firstSpawn.requestType), 'the request selects a non-empty Wave 1 enemy slot');
    assert.equal(firstSpawn.enemyIds.length, firstSpawn.groupSize);
    assert.ok(view.enemies.length > 0);
    assert.ok(view.enemies.every(({ maxHitPoints }) => maxHitPoints > 0));
  } finally {
    session.close();
  }
});

test('Colt City dispatches an actually hired Cannon from the real Fort pool location', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 28029,
  });

  try {
    const hire = session.observe().units.find(({ type, activity }) => type === 'cannon' && activity === 4);
    assert.ok(hire, 'Colt City includes TDM-backed hireable Cannon markers');
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'colt-city-cannon-hire' }), true);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.events.some(({ type }) => type === 'map-unit-hired'));
    assert.equal(view.wave?.cash, 450);

    for (let frame = 0; frame < 200 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'the Fort pool dispatches the hired Cannon without a map marker at the Fort');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_cannon');
    assert.deepEqual(spawned.cell, { x: 16, y: 10 });
  } finally {
    session.close();
  }
});
