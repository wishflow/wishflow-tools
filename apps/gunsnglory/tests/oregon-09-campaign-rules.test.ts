import assert from 'node:assert/strict';
import test from 'node:test';
import { createOregon09DynamiteFromUnlock } from '../src/content/oregon-09-dynamite';
import { createOregon09MapContent } from '../src/content/oregon-09-map-entities';
import map from '../src/content/oregon-09.json';
import {
  oregon09BaseEnemy,
  oregon09BonusCratePool,
  oregon09CampaignAwesomeEnemyTypeThreshold,
  oregon09EnemyByType,
  oregon09MaxUpgrades,
  oregon09PreviewWave,
} from '../src/content/oregon-09-campaign-rules';
import { oregon09CampaignWaves } from '../src/content/oregon-09-campaign-waves';
import { oregon09RouteDefinitions, oregon09SpawnPointIdByActionId } from '../src/content/oregon-09-routes';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedPool {
  actionId: number;
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
  { delayMs: 5_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    pools: [{ actionId: 2, counts: [1, 1, 2, 3, 2, 2, 1, 0] }] },
  { delayMs: 5_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    pools: [{ actionId: 0, counts: [2, 2, 2, 3, 2, 2, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, counts: [2, 2, 2, 3, 2, 2, 1, 0] },
      { actionId: 2, counts: [2, 2, 2, 3, 2, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, counts: [2, 2, 2, 3, 2, 2, 1, 0] },
      { actionId: 1, counts: [2, 2, 2, 3, 2, 2, 1, 0] },
      { actionId: 2, counts: [2, 2, 2, 3, 2, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, counts: [2, 2, 2, 3, 2, 2, 1, 1] },
      { actionId: 1, counts: [2, 2, 2, 3, 2, 2, 1, 1] },
      { actionId: 2, counts: [2, 2, 2, 3, 2, 2, 1, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 140,
    pools: [{ actionId: 1, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
    spawnPools: pools.map(({ actionId, counts, bossCount = 0 }) => {
      const spawnPointId = oregon09SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a route`);
      return [spawnPointId, 2_500, [...counts, bossCount, 0]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon09MapContent(() => false);
  return {
    id: 'snake-river-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Snake River', zh: '蛇河' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon09MaxUpgrades,
    previewWave: oregon09PreviewWave,
    campaignWaveCount: oregon09CampaignWaves.length,
    campaignWaves: oregon09CampaignWaves,
    campaignBonusCratePool: oregon09BonusCratePool,
    dynamite: createOregon09DynamiteFromUnlock(false),
    campaignAwesomeEnemyTypeThreshold: oregon09CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon09BaseEnemy,
    campaignEnemyByType: oregon09EnemyByType,
  };
}

test('Snake River level values, difficulty multipliers, and all six APK waves match static evidence', () => {
  assert.equal(oregon09MaxUpgrades, 3);
  assert.equal(oregon09PreviewWave.initialCash, 50);
  assert.equal(oregon09PreviewWave.initialLives, 25);
  assert.deepEqual(oregon09PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 82, medium: 110, hard: 150,
  });
  assert.deepEqual(oregon09BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon09CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon09PreviewWave.routes, oregon09RouteDefinitions);
  assert.deepEqual(Object.keys(oregon09SpawnPointIdByActionId).map(Number).sort(), [0, 1, 2]);
  assert.deepEqual(oregon09CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon09CampaignWaves.length, 6);
  assert.equal(oregon09CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 11);
  assert.ok(oregon09CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.deepEqual(oregon09CampaignWaves[5]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Boss remains in APK slot 10/request index 8');

  const scenario = createRulesScenario();
  assert.equal(scenario.campaignUnitPool, undefined, 'the APK has no player spawn-pool actions for this level');
  assert.equal(scenario.gambler, undefined, 'a nonzero cooldown value does not create a map Gambler');
  assert.equal(scenario.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('oregon-09-steamer-')).length, 4);
});

test('Snake River GameSession uses its economy, crate pool, and Wave 1 route without assuming enemy order', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 29029,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 6);
    assert.equal(view.wave?.cash, 50);
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
    assert.ok(firstSpawn, 'the first wave request spawns in a short fixed-seed session');
    assert.equal(firstSpawn.spawnPointId, oregon09SpawnPointIdByActionId[2]);
    assert.ok([2, 3, 4, 5, 6, 7, 8].includes(firstSpawn.requestType),
      'the selected request type is non-empty in the original Wave 1 vector');
    assert.equal(firstSpawn.enemyIds.length, firstSpawn.groupSize);
    assert.ok(view.enemies.length > 0);
    assert.ok(view.enemies.every(({ maxHitPoints }) => maxHitPoints > 0));
  } finally {
    session.close();
  }
});
