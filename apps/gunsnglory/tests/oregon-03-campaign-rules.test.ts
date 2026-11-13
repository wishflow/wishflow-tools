import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-03.json';
import { createOregon03MapContent } from '../src/content/oregon-03-map-entities';
import {
  oregon03BonusCratePool,
  oregon03CampaignAwesomeEnemyTypeThreshold,
  oregon03BaseEnemy,
  oregon03EnemyByType,
  oregon03MaxUpgrades,
  oregon03PreviewWave,
} from '../src/content/oregon-03-campaign-rules';
import { oregon03CampaignWaves } from '../src/content/oregon-03-campaign-waves';
import { oregon03CampaignUnitPool } from '../src/content/oregon-03-unit-pool';
import { oregon03RouteDefinitions, oregon03SpawnPointIdByActionId } from '../src/content/oregon-03-routes';
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
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [1, 1, 2, 3, 4, 0, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [1, 0, 2, 2, 3, 2, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [1, 2, 2, 2, 2, 2, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 2, 2, 1, 1, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 2, 1, 2, 1, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 140,
    pools: [{ actionId: 2, intervalMs: 2_500, counts: [1, 2, 1, 2, 1, 2, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 2, 2, 1, 1, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 2, 2, 1, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 150,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [0, 2, 2, 2, 1, 2, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 2, 2, 1, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 2, 2, 2, 1, 2, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 2, 2, 2, 1, 2, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 2, 2, 1, 2, 1, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 155,
    pools: [{ actionId: 0, intervalMs: 2_500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
      const spawnPointId = oregon03SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} action ${actionId} has a route`);
      return [spawnPointId, intervalMs, [...counts, 0, bossCount]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon03MapContent(() => true);
  return {
    id: 'chinook-woods-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Chinook Woods', zh: '奇努克森林' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon03MaxUpgrades,
    previewWave: oregon03PreviewWave,
    campaignWaveCount: oregon03CampaignWaves.length,
    campaignWaves: oregon03CampaignWaves,
    campaignUnitPool: oregon03CampaignUnitPool,
    campaignBonusCratePool: oregon03BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon03CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon03BaseEnemy,
    campaignEnemyByType: oregon03EnemyByType,
  };
}

test('Chinook Woods initial rules and all 14 source-ordered wave requests match the APK record', () => {
  assert.equal(oregon03MaxUpgrades, 3);
  assert.equal(oregon03PreviewWave.initialCash, 300);
  assert.equal(oregon03PreviewWave.initialLives, 25);
  assert.deepEqual(oregon03PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 97, medium: 125, hard: 150,
  });
  assert.deepEqual(oregon03BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon03CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon03PreviewWave.routes, oregon03RouteDefinitions);
  assert.deepEqual(oregon03SpawnPointIdByActionId, { 0: 1, 1: 0, 2: 2 });
  assert.deepEqual(oregon03CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon03CampaignWaves.length, 9);
  assert.equal(oregon03CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 14);
  assert.ok(oregon03CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.equal(oregon03CampaignWaves[8]?.spawnPools[0]?.requests[9], 1, 'wave nine uses the Boss slot');
  assert.equal(createRulesScenario().gambler, undefined, 'Chinook Woods has no Gambler marker');
});

test('Chinook Woods GameSession starts with APK values and releases its first Settler from action zero', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2323,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.cash, 300);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    for (let frame = 0; frame < 240 && view.enemies.length === 0; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const settler = view.enemies.find(({ type }) => type === 1 || type === 2);
    assert.ok(settler, 'wave one must release its Settler ×1 request');
    assert.equal(settler.asset, settler.type === 1 ? 'pioneer_male' : 'pioneer_female');
    assert.equal(settler.maxHitPoints, 225);

    const route = oregon03RouteDefinitions[oregon03SpawnPointIdByActionId[0]!]!;
    const direction = route.spawn.direction === 'west' ? { x: -1, y: 0 }
      : route.spawn.direction === 'east' ? { x: 1, y: 0 }
        : route.spawn.direction === 'north' ? { x: 0, y: -1 } : { x: 0, y: 1 };
    assert.deepEqual(settler.positionFine, {
      x: (route.spawn.cell.x * 7_680) + 3_840 - (direction.x * 2 * 7_680),
      y: (route.spawn.cell.y * 7_680) + 3_840 - (direction.y * 2 * 7_680),
    });
  } finally {
    session.close();
  }
});

test('Chinook Woods wave-one pool actions let a hired Indian spawn at the Tipi', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2324,
  });

  try {
    const indianHire = session.observe().units.find(({ type, activity }) => type === 'indian' && activity === 4);
    assert.ok(indianHire, 'the map contains an activity-4 Indian hire marker');
    assert.equal(session.submitIntent({ type: 'select-at', x: indianHire.cell.x + 0.5, y: indianHire.cell.y + 0.5 }), true);
    let view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === indianHire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: indianHire.id, commandId: 'chinook-indian-hire' }), true);

    view = session.advance({ deltaMs: 100 });
    assert.ok(view.events.some(({ type }) => type === 'map-unit-hired'), 'the Indian hire request is accepted');
    assert.equal(view.wave?.cash, 175);

    for (let frame = 0; frame < 180 && !view.units.some(({ id }) => id === 'indian-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'indian-spawn-01');
    assert.ok(spawned, 'wave-one SET_MAX allows the hired Indian to spawn through the Tipi pool');
    assert.equal(spawned.type, 'indian');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_indian');
    assert.deepEqual(spawned.cell, { x: 1, y: 18 });
  } finally {
    session.close();
  }
});
