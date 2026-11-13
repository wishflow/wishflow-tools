import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-04.json';
import {
  oregon04BonusCratePool,
  oregon04CampaignAwesomeEnemyTypeThreshold,
  oregon04BaseEnemy,
  oregon04EnemyByType,
  oregon04MaxUpgrades,
  oregon04PreviewWave,
} from '../src/content/oregon-04-campaign-rules';
import { oregon04CampaignWaves } from '../src/content/oregon-04-campaign-waves';
import { createOregon04MapContent } from '../src/content/oregon-04-map-entities';
import { oregon04CampaignUnitPool } from '../src/content/oregon-04-unit-pool';
import { oregon04RouteDefinitions, oregon04SpawnPointIdByActionId } from '../src/content/oregon-04-routes';
import {
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
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
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 120,
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [1, 1, 2, 3, 4, 1, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 125,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [1, 1, 2, 3, 4, 1, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [2, 1, 2, 3, 2, 1, 0, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 2, 2, 2, 1, 0, 0] },
    ] },
  { delayMs: 20_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 135,
    pools: [{ actionId: 2, intervalMs: 2_500, counts: [1, 1, 2, 3, 4, 2, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 140,
    pools: [
      { actionId: 2, intervalMs: 2_500, counts: [0, 0, 2, 3, 4, 2, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 2, 2, 2, 1, 0, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 3_000, counts: [0, 1, 1, 3, 3, 2, 1, 0] },
      { actionId: 1, intervalMs: 3_000, counts: [0, 0, 2, 2, 2, 2, 0, 1] },
      { actionId: 2, intervalMs: 3_000, counts: [0, 1, 2, 1, 2, 2, 1, 1] },
    ] },
  { delayMs: 20_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 150,
    pools: [
      { actionId: 2, intervalMs: 3_000, counts: [0, 1, 1, 3, 3, 2, 2, 1] },
      { actionId: 3, intervalMs: 3_000, counts: [0, 1, 2, 2, 3, 3, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 3_500, counts: [0, 1, 1, 2, 3, 2, 1, 0] },
      { actionId: 1, intervalMs: 3_500, counts: [0, 0, 2, 2, 2, 2, 0, 1] },
      { actionId: 2, intervalMs: 3_500, counts: [0, 1, 1, 2, 3, 2, 2, 1] },
      { actionId: 3, intervalMs: 3_500, counts: [0, 1, 2, 2, 3, 3, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 220, speedMultiplierPercent: 160,
    pools: [
      { actionId: 0, intervalMs: 3_500, counts: [0, 1, 1, 2, 3, 2, 1, 1] },
      { actionId: 1, intervalMs: 3_500, counts: [0, 0, 2, 2, 2, 2, 0, 1] },
      { actionId: 2, intervalMs: 3_500, counts: [0, 1, 1, 2, 3, 2, 2, 1] },
      { actionId: 3, intervalMs: 3_500, counts: [0, 1, 2, 2, 3, 3, 2, 1] },
      { actionId: 4, intervalMs: 3_500, counts: [0, 1, 2, 2, 3, 2, 2, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 150,
    pools: [{ actionId: 0, intervalMs: 500, counts: [0, 0, 0, 2, 0, 0, 0, 0], bossCount: 1 }] },
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
      const spawnPointId = oregon04SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a route`);
      return [spawnPointId, intervalMs, [...counts, 0, bossCount]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon04MapContent(() => true);
  return {
    id: 'fort-echo-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Fort Echo', zh: '回声堡' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon04MaxUpgrades,
    previewWave: oregon04PreviewWave,
    campaignWaveCount: oregon04CampaignWaves.length,
    campaignWaves: oregon04CampaignWaves,
    campaignUnitPool: oregon04CampaignUnitPool,
    campaignBonusCratePool: oregon04BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon04CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon04BaseEnemy,
    campaignEnemyByType: oregon04EnemyByType,
  };
}

test('Fort Echo initial rules and all 22 source-ordered wave pools match APK data', () => {
  assert.equal(oregon04MaxUpgrades, 3);
  assert.equal(oregon04PreviewWave.initialCash, 250);
  assert.equal(oregon04PreviewWave.initialLives, 25);
  assert.deepEqual(oregon04PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 140,
  });
  assert.deepEqual(oregon04BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon04CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon04PreviewWave.routes, oregon04RouteDefinitions);
  assert.deepEqual(Object.keys(oregon04SpawnPointIdByActionId).map(Number).sort(), [0, 1, 2, 3, 4]);
  assert.deepEqual(oregon04CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon04CampaignWaves.length, 10);
  assert.equal(oregon04CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 22);
  assert.ok(oregon04CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.deepEqual(oregon04CampaignWaves[9]?.spawnPools[0]?.requests, [0, 0, 0, 2, 0, 0, 0, 0, 0, 1],
    'final wave uses the Boss request slot after eight ordinary enemy slots and the unused slot');
  assert.equal(createRulesScenario().gambler, undefined, 'Fort Echo has no Gambler marker');
});

test('Fort Echo wave one starts with APK economy and releases a configured enemy', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2727,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 10);
    assert.equal(view.wave?.cash, 250);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    for (let frame = 0; frame < 240 && view.enemies.length === 0; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const enemy = view.enemies[0];
    assert.ok(enemy, 'wave one releases at least one enemy from its configured request pools');
    assert.ok(enemy.maxHitPoints > 0);
    assert.ok(Number.isFinite(enemy.positionFine.x) && Number.isFinite(enemy.positionFine.y));
  } finally {
    session.close();
  }
});

test('Fort Echo Wave 1 clears player stock and grants a four-Cannon cap at the real Fort', async () => {
  const runtime = createCampaignUnitPoolRuntime(oregon04CampaignUnitPool)!;
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 0, 0]);
  applyCampaignUnitPoolActions(runtime, oregon04CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'SET clears Wave 1 player stock');
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 4, 0], 'SET_MAX permits four Fort Cannons only');

  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2728,
  });

  try {
    const hire = session.observe().units.find(({ type, activity }) => type === 'cannon' && activity === 4);
    assert.ok(hire, 'Fort Echo includes a TDM-backed hireable Cannon');
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'fort-echo-cannon-hire' }), true);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.events.some(({ type }) => type === 'map-unit-hired'));
    assert.equal(view.wave?.cash, 100);

    for (let frame = 0; frame < 200 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'the hired Cannon dispatches through the actual Fort pool');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_cannon');
    assert.deepEqual(spawned.cell, { x: 10, y: 12 });
  } finally {
    session.close();
  }
});
