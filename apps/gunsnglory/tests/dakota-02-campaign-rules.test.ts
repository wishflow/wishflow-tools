import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-02.json';
import {
  dakota02BaseEnemy,
  dakota02BonusCratePool,
  dakota02CampaignAwesomeEnemyTypeThreshold,
  dakota02EnemyByType,
  dakota02MaxUpgrades,
  dakota02PreviewWave,
} from '../src/content/dakota-02-campaign-rules';
import { dakota02CampaignUnitPool } from '../src/content/dakota-02-unit-pool';
import { dakota02CampaignWaves } from '../src/content/dakota-02-campaign-waves';
import { dakota02SpawnPointIdByActionId } from '../src/content/dakota-02-routes';
import { createDakota02MapScene } from '../src/content/dakota-02-scene';
import { createDakota02MapUnits } from '../src/content/dakota-02-units';
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

// Independent values transcribed from map32-static-audit.md and its APK Smali derivation.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [3, 3, 4, 5, 3, 3, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 125,
    pools: [{ actionId: 1, intervalMs: 2_500, counts: [2, 2, 3, 4, 3, 3, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 130,
    pools: [{ actionId: 1, intervalMs: 2_500, counts: [1, 2, 4, 4, 3, 3, 2, 1] }] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    pools: [{ actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 4, 3, 3, 2, 1] }] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 4, 3, 3, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 4, 4, 3, 3, 2, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 6_000, counts: [0, 0, 0, 0, 0, 1, 2, 4] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 4, 4, 3, 3, 2, 1] },
      { actionId: 2, intervalMs: 3_500, counts: [1, 2, 4, 4, 3, 2, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 6_000, counts: [0, 0, 0, 0, 0, 0, 1, 4] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 1, 2, 4, 2, 4, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 2, 4, 2, 4, 2, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 160,
    pools: [{ actionId: 0, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
      const spawnPointId = dakota02SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a TDM route`);
      return [spawnPointId, intervalMs, [...counts, bossCount, 0]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  return {
    id: 'six-grandfathers-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Six Grandfathers', zh: '六祖父山' },
    map: createDakota02MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota02MapUnits(),
    maxUpgrades: dakota02MaxUpgrades,
    previewWave: dakota02PreviewWave,
    campaignWaveCount: dakota02CampaignWaves.length,
    campaignWaves: dakota02CampaignWaves,
    campaignUnitPool: dakota02CampaignUnitPool,
    campaignBonusCratePool: dakota02BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota02CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota02BaseEnemy,
    campaignEnemyByType: dakota02EnemyByType,
  };
}

test('Six Grandfathers level data and all source-ordered APK waves match the independent audit', () => {
  assert.equal(dakota02MaxUpgrades, 3);
  assert.equal(dakota02PreviewWave.initialCash, 250);
  assert.equal(dakota02PreviewWave.initialLives, 25);
  assert.deepEqual(dakota02PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 56, medium: 75, hard: 98,
  });
  assert.deepEqual(dakota02BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(dakota02CampaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(dakota02PreviewWave.routes?.length, 5, 'route definitions preserve all branch variants');
  assert.equal(1 + (dakota02PreviewWave.additionalSpawns?.length ?? 0), 3, 'three TDM spawn markers remain distinct');
  assert.deepEqual(dakota02SpawnPointIdByActionId, { 0: 1, 1: 2, 2: 0 });
  assert.deepEqual(dakota02CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(dakota02CampaignWaves.length, 8);
  assert.equal(dakota02CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 13);
  assert.ok(dakota02CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota02CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)));
  assert.deepEqual(dakota02CampaignWaves[7]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 8 Boss count uses APK slot 10/request index 8');
});

test('Six Grandfathers Wave 1 resets Saloon/Tipi stock and sets the APK pool caps', () => {
  const runtime = createCampaignUnitPoolRuntime(dakota02CampaignUnitPool);
  assert.ok(runtime);
  runtime.pending[1] = 3;
  runtime.pending[2] = 3;
  runtime.pending[4] = 3;
  applyCampaignUnitPoolActions(runtime, dakota02CampaignUnitPool, 1);
  assert.equal(runtime.pending[1], 0);
  assert.equal(runtime.pending[2], 0);
  assert.equal(runtime.pending[4], 0);
  assert.equal(runtime.maximum[1], 3);
  assert.equal(runtime.maximum[2], 3);
  assert.equal(runtime.maximum[4], 3);
  assert.equal(dakota02CampaignUnitPool.units.some(({ poolType }) => poolType === 3), false,
    'the zero-cap Cannon action has no Fort source marker and creates no Cannon pool');
});

test('Six Grandfathers opens with APK resources and Wave 1 spawns from action 1', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 32_035,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
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
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.spawnPointId, dakota02SpawnPointIdByActionId[1]);
    assert.ok([1, 2, 3, 4, 5, 6, 7, 8].includes(firstSpawn.requestType));
    assert.equal(firstSpawn.enemyIds.length, firstSpawn.groupSize);
  } finally {
    session.close();
  }
});

test('Six Grandfathers isolated Wave 8 request spawns the APK Boss type from slot 10', async () => {
  const scenario = createRulesScenario();
  const lastWave = dakota02CampaignWaves.at(-1)!;
  const bossScenario: ScenarioContent = {
    ...scenario,
    id: 'six-grandfathers-boss-wave-fixture',
    campaignWaveCount: 1,
    campaignWaves: [{
      ...lastWave,
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
    randomSeed: 32_036,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 30 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.ok(boss, 'Wave 8 slot-10 request creates the APK Boss');
    assert.equal(boss.asset, 'boss');
    assert.ok(boss.maxHitPoints > 0);
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned' && event.requestType === 7));
  } finally {
    session.close();
  }
});
