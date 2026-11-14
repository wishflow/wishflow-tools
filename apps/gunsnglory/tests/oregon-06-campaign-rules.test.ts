import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-06.json';
import {
  oregon06BonusCratePool,
  oregon06CampaignAwesomeEnemyTypeThreshold,
  oregon06BaseEnemy,
  oregon06EnemyByType,
  oregon06MaxUpgrades,
  oregon06PreviewWave,
} from '../src/content/oregon-06-campaign-rules';
import { oregon06CampaignWaves } from '../src/content/oregon-06-campaign-waves';
import { createOregon06Dynamite } from '../src/content/oregon-06-dynamite';
import { createOregon06MapContent } from '../src/content/oregon-06-map-entities';
import { oregon06CampaignUnitPool } from '../src/content/oregon-06-unit-pool';
import { oregon06RouteDefinitions, oregon06SpawnPointIdByActionId } from '../src/content/oregon-06-routes';
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
  { delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [2, 2, 2, 3, 1, 1, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [1, 1, 1, 2, 1, 2, 1, 0] }] },
  { delayMs: 20_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 1, 1, 1, 2, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 1, 1, 2, 1, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [1, 1, 2, 2, 2, 3, 2, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 3, 2, 2, 3, 2, 2, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [2, 3, 2, 2, 3, 2, 2, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 140,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [1, 1, 2, 2, 3, 3, 1, 2] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 2, 2, 2, 3, 2, 1, 2] },
      { actionId: 3, intervalMs: 2_500, counts: [2, 2, 2, 3, 3, 2, 1, 2] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 1, 2, 2, 2, 3, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 1, 2, 2, 2, 3, 2, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 3, 2, 2, 3, 2, 2, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [2, 3, 2, 2, 2, 2, 2, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 2, 3, 3, 3, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 1, 2, 3, 3, 3, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 2, 3, 3, 3, 2, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 1, 2, 3, 3, 3, 2, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 160,
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
      const spawnPointId = oregon06SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a route`);
      return [spawnPointId, intervalMs, [...counts, 0, bossCount]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon06MapContent(() => true);
  return {
    id: 'columbia-river-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Columbia River', zh: '哥伦比亚河' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon06MaxUpgrades,
    previewWave: oregon06PreviewWave,
    campaignWaveCount: oregon06CampaignWaves.length,
    campaignWaves: oregon06CampaignWaves,
    campaignUnitPool: oregon06CampaignUnitPool,
    campaignBonusCratePool: oregon06BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon06CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon06BaseEnemy,
    campaignEnemyByType: oregon06EnemyByType,
    dynamite: createOregon06Dynamite(['campaign-mississippi-10']),
  };
}

test('Columbia River initial rules, difficulty, and all 19 source-ordered wave pools match APK data', () => {
  assert.equal(oregon06MaxUpgrades, 3);
  assert.equal(oregon06PreviewWave.initialCash, 375);
  assert.equal(oregon06PreviewWave.initialLives, 25);
  assert.deepEqual(oregon06PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 175,
  });
  assert.deepEqual(oregon06BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon06CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon06PreviewWave.routes, oregon06RouteDefinitions);
  assert.deepEqual(Object.keys(oregon06SpawnPointIdByActionId).map(Number).sort(), [0, 1, 2, 3]);
  assert.deepEqual(oregon06CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon06CampaignWaves.length, 8);
  assert.equal(oregon06CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 19);
  assert.ok(oregon06CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.deepEqual(oregon06CampaignWaves[7]?.spawnPools[0]?.requests, [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    'final wave uses the Boss slot after eight APK request slots and the reserved slot');
});

test('Columbia River Wave 1 resets all four player pools and sets their two-unit caps', () => {
  const runtime = createCampaignUnitPoolRuntime(oregon06CampaignUnitPool)!;
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 0, 0]);
  applyCampaignUnitPoolActions(runtime, oregon06CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'APK SET action clears Wave 1 stock');
  assert.deepEqual(runtime.maximum.slice(1, 5), [2, 2, 2, 2], 'APK SET_MAX action applies to pool types 1–4');
});

test('Columbia River GameSession opens with APK economy and creates a configured Wave 1 enemy', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2626,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.cash, 375);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    for (let frame = 0; frame < 300 && view.enemies.length === 0; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const enemy = view.enemies[0];
    assert.ok(enemy, 'Wave 1 releases at least one enemy from its configured request');
    assert.ok(enemy.maxHitPoints > 0);
    assert.ok(Number.isFinite(enemy.positionFine.x) && Number.isFinite(enemy.positionFine.y));
  } finally {
    session.close();
  }
});

test('Columbia River hires a Cannon into the Wave 1 pool and dispatches it from the real Fort', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2627,
  });

  try {
    const hire = session.observe().units.find(({ type, activity }) => type === 'cannon' && activity === 4);
    assert.ok(hire, 'Columbia River has TDM-backed Cannon hire markers');
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'columbia-river-cannon-hire' }), true);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.events.some(({ type }) => type === 'map-unit-hired'));
    assert.equal(view.wave?.cash, 225);

    for (let frame = 0; frame < 200 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'the hired Cannon is dispatched by the configured Fort pool');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_cannon');
    assert.deepEqual(spawned.cell, { x: 21, y: 21 });
  } finally {
    session.close();
  }
});
