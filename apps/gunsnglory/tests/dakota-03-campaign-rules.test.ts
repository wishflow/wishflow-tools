import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-03.json';
import {
  dakota03BaseEnemy,
  dakota03BonusCratePool,
  dakota03CampaignAwesomeEnemyTypeThreshold,
  dakota03EnemyByType,
  dakota03MaxUpgrades,
  dakota03PreviewWave,
} from '../src/content/dakota-03-campaign-rules';
import { dakota03CampaignWaves } from '../src/content/dakota-03-campaign-waves';
import { dakota03SpawnPointIdByActionId } from '../src/content/dakota-03-routes';
import { createDakota03MapScene } from '../src/content/dakota-03-scene';
import { createDakota03MapUnits } from '../src/content/dakota-03-units';
import { dakota03CampaignUnitPool } from '../src/content/dakota-03-unit-pool';
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

// Independent values transcribed from fort-knockout-static-audit.md and its APK branch analysis.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [2, 3, 4, 5, 3, 2, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [2, 3, 4, 5, 3, 2, 2, 0] }] },
  { delayMs: 25_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 2, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 3, 4, 5, 3, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 2, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 3, 4, 5, 3, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 5, 4, 3, 1, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 4, 2, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 3, 4, 5, 2, 4, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 5, 4, 4, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 4, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 3, 4, 5, 3, 4, 2, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 150,
    pools: [{ actionId: 3, intervalMs: 2_500, counts: [1, 1, 3, 5, 3, 4, 3, 2] }] },
  { delayMs: 25_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 0, 3, 5, 4, 4, 3, 3] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 3, 5, 4, 4, 3, 3] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 195, speedMultiplierPercent: 160,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 0, 3, 5, 4, 4, 3, 2] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 4, 5, 3, 4, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 1, 4, 5, 3, 4, 2, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 3, 5, 4, 4, 3, 2] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 165,
    pools: [{ actionId: 2, intervalMs: 500, counts: [5, 4, 3, 3, 0, 0, 0, 0], bossCount: 1 }] },
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
      const spawnPointId = dakota03SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a TDM route`);
      return [spawnPointId, intervalMs, [...counts, bossCount, 0]] as const;
    }),
  }));
}

function createRulesScenario(campaignWaves: readonly CampaignWaveDefinition[] = dakota03CampaignWaves): ScenarioContent {
  return {
    id: 'fort-knockout-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Fort Knockout', zh: '堡垒击破' },
    map: createDakota03MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota03MapUnits(),
    maxUpgrades: dakota03MaxUpgrades,
    previewWave: dakota03PreviewWave,
    campaignWaveCount: dakota03CampaignWaves.length,
    campaignWaves,
    campaignUnitPool: dakota03CampaignUnitPool,
    campaignBonusCratePool: dakota03BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota03CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota03BaseEnemy,
    campaignEnemyByType: dakota03EnemyByType,
  };
}

test('Fort Knockout level data and all twenty APK wave pools match the independent static audit', () => {
  assert.equal(dakota03MaxUpgrades, 3);
  assert.equal(dakota03PreviewWave.initialCash, 300);
  assert.equal(dakota03PreviewWave.initialLives, 25);
  assert.deepEqual(dakota03PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 56, medium: 75, hard: 90,
  });
  assert.deepEqual(dakota03BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(dakota03CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(dakota03SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });
  assert.equal(dakota03PreviewWave.routes?.length, 4);
  assert.equal(dakota03PreviewWave.enemy, dakota03BaseEnemy);
  assert.equal(dakota03CampaignWaves.length, 10);
  assert.deepEqual(dakota03CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(dakota03CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 20);
  assert.ok(dakota03CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota03CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)));
  assert.deepEqual(dakota03CampaignWaves[9]?.spawnPools[0]?.requests, [5, 4, 3, 3, 0, 0, 0, 0, 1, 0],
    'Wave 10 uses the APK Boss slot at request index 8 and leaves Doc at index 9 empty');
});

test('Fort Knockout opens with the level-33 economy and Wave 1 enemy requests while retaining Cannon pool actions', async () => {
  const runtime = createCampaignUnitPoolRuntime(dakota03CampaignUnitPool)!;
  runtime.pending[1] = 2;
  runtime.pending[2] = 3;
  runtime.pending[4] = 1;
  applyCampaignUnitPoolActions(runtime, dakota03CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 5, 0]);

  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3304,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 10);
    assert.equal(view.wave?.pendingSpawnRequests, 19);
    assert.equal(view.wave?.cash, 300);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    let firstSpawn: { spawnPointId: number; requestType: number; waveNumber: number } | undefined;
    for (let frame = 0; frame < 300 && firstSpawn === undefined; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned') firstSpawn = event;
    }
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.waveNumber, 1);
    assert.equal(firstSpawn.spawnPointId, dakota03SpawnPointIdByActionId[0]);
    assert.ok(firstSpawn.requestType >= 1 && firstSpawn.requestType <= 8);
  } finally {
    session.close();
  }
});

test('a short isolated GameSession consumes Fort Knockout Wave 10 request index 8 as the Boss', async () => {
  // Empty prior waves only fast-forward this test fixture; Wave 10 keeps the APK Boss request.
  const bossProbeWaves = dakota03CampaignWaves.map((wave) => wave.number === 10
    ? {
      ...wave,
      delayMs: 0,
      spawnPools: [{
        ...wave.spawnPools[0]!,
        intervalMs: 0,
        requests: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
      }],
    }
    : { ...wave, delayMs: 0, spawnPools: [] });
  const scenario = createRulesScenario(bossProbeWaves);
  const bossPool = dakota03CampaignWaves[9]!.spawnPools[0]!;
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 33_010,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 30 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    assert.equal(view.wave?.number, 10);
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.ok(boss);
    assert.equal(boss.asset, 'boss');
    assert.ok(boss.hitPoints > 0);
    assert.deepEqual(view.events.find((event) => event.type === 'enemy-group-spawned'), {
      type: 'enemy-group-spawned',
      enemyIds: [boss.id],
      waveNumber: 10,
      spawnPointId: bossPool.spawnPointId,
      requestType: 7,
      groupSize: 1,
    });
  } finally {
    session.close();
  }
});
