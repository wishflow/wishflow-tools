import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-11.json';
import { createOregon11DynamiteFromUnlock } from '../src/content/oregon-11-dynamite';
import { createOregon11MapContent } from '../src/content/oregon-11-map-entities';
import {
  oregon11BaseEnemy,
  oregon11BonusCratePool,
  oregon11CampaignAwesomeEnemyTypeThreshold,
  oregon11EnemyByType,
  oregon11MaxUpgrades,
  oregon11PreviewWave,
} from '../src/content/oregon-11-campaign-rules';
import { oregon11CampaignUnitPool } from '../src/content/oregon-11-unit-pool';
import { oregon11CampaignWaves } from '../src/content/oregon-11-campaign-waves';
import { oregon11RouteDefinitions, oregon11SpawnPointIdByActionId } from '../src/content/oregon-11-routes';
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

// Independent expected values transcribed from the map34 level-31 Smali audit.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [3, 3, 4, 5, 3, 3, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 130,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [1, 1, 4, 5, 4, 4, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 1, 4, 5, 4, 4, 2, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 1, 4, 5, 4, 4, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: 2_000, counts: [0, 0, 0, 3, 9, 1, 0, 0] },
      { actionId: 1, intervalMs: 2_000, counts: [0, 0, 0, 3, 9, 1, 0, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 3, 3, 4, 4, 2, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 3, 4, 4, 4, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 145,
    pools: [{ actionId: 2, intervalMs: 2_500, counts: [0, 0, 2, 3, 4, 4, 3, 2] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 2, 3, 4, 4, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 0, 2, 3, 4, 4, 3, 2] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 2, 3, 4, 4, 3, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 215, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 2, 3, 4, 4, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 0, 2, 3, 4, 4, 3, 2] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 2, 3, 4, 4, 3, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 230, speedMultiplierPercent: 160,
    pools: [{ actionId: 1, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
      const spawnPointId = oregon11SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a TDM route`);
      return [spawnPointId, intervalMs, [...counts, bossCount, 0]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon11MapContent(() => false);
  return {
    id: 'loot-lakes-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Loot Lakes', zh: '湖泊金矿' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon11MaxUpgrades,
    previewWave: oregon11PreviewWave,
    campaignWaveCount: oregon11CampaignWaves.length,
    campaignWaves: oregon11CampaignWaves,
    campaignUnitPool: oregon11CampaignUnitPool,
    campaignBonusCratePool: oregon11BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon11CampaignAwesomeEnemyTypeThreshold,
    dynamite: createOregon11DynamiteFromUnlock(false),
    campaignEnemy: oregon11BaseEnemy,
    campaignEnemyByType: oregon11EnemyByType,
  };
}

test('Loot Lakes level data and all source-ordered APK waves match the independent Smali audit', () => {
  assert.equal(oregon11MaxUpgrades, 3);
  assert.equal(oregon11PreviewWave.initialCash, 250);
  assert.equal(oregon11PreviewWave.initialLives, 25);
  assert.deepEqual(oregon11PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 56, medium: 75, hard: 100,
  });
  assert.deepEqual(oregon11BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon11CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon11PreviewWave.routes, oregon11RouteDefinitions);
  assert.deepEqual(oregon11SpawnPointIdByActionId, { 0: 2, 1: 1, 2: 0 });
  assert.deepEqual(oregon11CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon11CampaignWaves.length, 9);
  assert.equal(oregon11CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 16);
  assert.ok(oregon11CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(oregon11CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)));
  assert.deepEqual(oregon11CampaignWaves[8]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 9 Boss count uses APK slot 10/request index 8');
});

test('Loot Lakes Wave 1 applies zero stock and the APK lifetime caps to every player pool type', () => {
  const runtime = createCampaignUnitPoolRuntime(oregon11CampaignUnitPool);
  assert.ok(runtime);
  runtime.pending.splice(1, 5, 3, 3, 1, 1);
  applyCampaignUnitPoolActions(runtime, oregon11CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [2, 2, 0, 0]);
});

test('Loot Lakes GameSession opens with APK resources and spawns Wave 1 from action 1', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 31_030,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.cash, 250);
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
    assert.equal(firstSpawn.spawnPointId, oregon11SpawnPointIdByActionId[1]);
    assert.ok([2, 3, 4, 5, 6, 7].includes(firstSpawn.requestType));
    assert.equal(firstSpawn.enemyIds.length, firstSpawn.groupSize);
  } finally {
    session.close();
  }
});

test('Loot Lakes isolated Wave 9 request spawns the APK Boss type from slot 10', async () => {
  const scenario = createRulesScenario();
  const sourceLastWave = oregon11CampaignWaves.at(-1)!;
  const bossScenario: ScenarioContent = {
    ...scenario,
    id: 'loot-lakes-boss-wave-fixture',
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
    randomSeed: 31_031,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 30 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.ok(boss, 'Wave 9 slot-10 request creates an APK Boss');
    assert.equal(boss.asset, 'boss');
    assert.ok(boss.maxHitPoints > 0);
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned' && event.requestType === 7));
  } finally {
    session.close();
  }
});
