import assert from 'node:assert/strict';
import test from 'node:test';
import { lostCityCampaignWaves } from '../src/content/lost-city-campaign-waves';
import {
  lostCityBaseEnemy,
  lostCityBonusCratePool,
  lostCityCampaignAwesomeEnemyTypeThreshold,
  lostCityEnemyByType,
  lostCityMaxUpgrades,
  lostCityPreviewWave,
} from '../src/content/lost-city-campaign-rules';
import { lostCityUnitPool } from '../src/content/lost-city-unit-pool';
import { lostCityExits, lostCityRedirects, lostCityRouteDefinitions, lostCitySpawnPoints } from '../src/content/lost-city-routes';
import { createLostCityMapScene } from '../src/content/lost-city-scene';
import { createLostCityMapUnits, createLostCityTrainUnits } from '../src/content/lost-city-units';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import map from '../src/content/new-mexico-10.json';

const expectedWaves = [
  { delay: 15_000, hp: 200, speed: 100, pools: [[0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { delay: 5_000, hp: 250, speed: 105, pools: [[0, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]]] },
  { delay: 5_000, hp: 200, speed: 110, pools: [[0, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]]] },
  { delay: 5_000, hp: 175, speed: 110, pools: [[0, 3_000, [1, 0, 2, 2, 3, 4, 1, 0, 0, 0]], [1, 3_000, [1, 2, 2, 2, 3, 3, 2, 1, 0, 0]], [2, 3_000, [1, 0, 2, 2, 3, 3, 1, 0, 0, 0]]] },
  { delay: 5_000, hp: 200, speed: 110, pools: [[0, 3_500, [0, 0, 1, 2, 2, 3, 1, 1, 0, 0]], [1, 3_500, [0, 0, 1, 2, 2, 2, 1, 0, 0, 0]], [2, 3_500, [0, 0, 1, 2, 2, 2, 2, 0, 0, 0]]] },
  { delay: 5_000, hp: 180, speed: 115, pools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 3_500, [0, 2, 1, 0, 2, 3, 2, 1, 0, 0]]] },
  { delay: 5_000, hp: 200, speed: 110, pools: [[0, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [1, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [2, 3_500, [0, 2, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 4_000, [0, 2, 0, 0, 3, 3, 2, 1, 0, 0]]] },
  { delay: 5_000, hp: 225, speed: 120, pools: [[0, 4_000, [1, 1, 0, 0, 3, 4, 3, 1, 0, 0]], [1, 3_500, [1, 1, 0, 0, 3, 4, 2, 1, 0, 0]], [2, 3_500, [0, 2, 0, 0, 3, 4, 3, 1, 0, 0]], [3, 4_000, [0, 2, 0, 0, 3, 4, 2, 1, 0, 0]]] },
  { delay: 5_000, hp: 250, speed: 110, pools: [[0, 6_000, [0, 0, 0, 0, 0, 0, 0, 3, 0, 0]], [1, 6_500, [0, 0, 0, 0, 0, 0, 0, 3, 0, 0]], [2, 6_500, [0, 0, 0, 0, 0, 0, 0, 3, 0, 0]], [3, 6_000, [0, 0, 0, 0, 0, 0, 0, 3, 0, 0]]] },
  { delay: 5_000, hp: 280, speed: 120, pools: [[0, 4_000, [1, 1, 0, 0, 5, 4, 3, 1, 0, 0]], [1, 3_500, [1, 1, 0, 0, 5, 4, 2, 2, 0, 0]], [2, 3_500, [0, 2, 0, 0, 5, 4, 3, 1, 0, 0]], [3, 4_000, [0, 2, 0, 0, 5, 4, 3, 2, 0, 0]]] },
] as const;

function makeRulesContent(waves: readonly CampaignWaveDefinition[]): ScenarioContent {
  const scenarioId = 'lost-city-rules-test';
  return {
    ...map,
    id: scenarioId,
    title: { en: 'Lost City test', zh: '失落之城测试' },
    map: createLostCityMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...createLostCityMapUnits(() => true), ...createLostCityTrainUnits()],
    maxUpgrades: lostCityMaxUpgrades,
    previewWave: lostCityPreviewWave,
    campaignWaveCount: waves.length,
    campaignWaves: waves,
    campaignUnitPool: lostCityUnitPool,
    campaignBonusCratePool: lostCityBonusCratePool,
    campaignAwesomeEnemyTypeThreshold: lostCityCampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: lostCityBaseEnemy,
    campaignEnemyByType: lostCityEnemyByType,
    formalSettlementSupported: true,
  };
}

test('matches all ten APK wave delays, multipliers, spawn pools, intervals, and ten request slots', () => {
  assert.deepEqual(lostCityCampaignWaves.map(({ number, delayMs, hitPointMultiplierPercent,
    speedMultiplierPercent, spawnPools }) => ({
    number,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: spawnPools.map(({ spawnPointId, intervalMs, requests }) => [spawnPointId, intervalMs, requests]),
  })), expectedWaves.map((wave, index) => ({
    number: index + 1,
    delayMs: wave.delay,
    hitPointMultiplierPercent: wave.hp,
    speedMultiplierPercent: wave.speed,
    spawnPools: wave.pools,
  })));
  assert.equal(lostCityCampaignWaves.length, 10);
  assert.equal(lostCityCampaignWaves.reduce((count, wave) => count + wave.spawnPools.length, 0), 29);
  assert.ok(lostCityCampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('uses the APK opening economy, level difficulty, upgrade cap, enemy rows, and crate parameters', () => {
  assert.equal(lostCityMaxUpgrades, 3);
  assert.equal(lostCityPreviewWave.initialCash, 350);
  assert.equal(lostCityPreviewWave.initialLives, 25);
  assert.deepEqual(lostCityPreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 150, hard: 188,
  });
  assert.deepEqual(lostCityPreviewWave.spawn, lostCitySpawnPoints[0]);
  assert.deepEqual(lostCityPreviewWave.additionalSpawns, lostCitySpawnPoints.slice(1));
  assert.deepEqual(lostCityPreviewWave.routes, lostCityRouteDefinitions);
  assert.deepEqual(lostCityPreviewWave.redirects, lostCityRedirects);
  assert.deepEqual(lostCityPreviewWave.exit, lostCityExits[0]);
  assert.deepEqual(lostCityPreviewWave.additionalExits, lostCityExits.slice(1));
  assert.equal(lostCityCampaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(lostCityBaseEnemy.hitPoints, 18);
  assert.equal(lostCityEnemyByType[3]?.hitPoints, 60);
  assert.equal(lostCityEnemyByType[4]?.hitPoints, 200);
  assert.equal(lostCityEnemyByType[5]?.hitPoints, 300);
  assert.equal(lostCityEnemyByType[6]?.hitPoints, 500);
  assert.equal(lostCityEnemyByType[8]?.hitPoints, 200);
  assert.deepEqual(lostCityBonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 32, rewardTypeCount: 4,
  });
});

test('builds the four-pool player recruitment table from all three APK buildings', () => {
  assert.deepEqual(lostCityUnitPool, {
    intervalMs: 15_000,
    units: [
      { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
      { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
      { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
      { poolType: 4, unitType: 'indian', spawnLocationType: 3 },
    ],
    spawnLocations: [
      { id: 'tipi', spawnLocationType: 3, cell: { x: 3, y: 2 } },
      { id: 'saloon', spawnLocationType: 1, cell: { x: 27, y: 3 } },
      { id: 'fort', spawnLocationType: 2, cell: { x: 28, y: 17 } },
    ],
    actions: [
      { waveNumber: 1, action: 'set', values: [1, 2, 3, 4].map((poolType) => ({ poolType, count: 0 })) },
      { waveNumber: 1, action: 'set-max', values: [7, 6, 4, 5].map((count, index) => ({ poolType: index + 1, count })) },
    ],
  });

  const runtime = createCampaignUnitPoolRuntime(lostCityUnitPool)!;
  runtime.pending.fill(12);
  runtime.maximum.fill(12);
  applyCampaignUnitPoolActions(runtime, lostCityUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [7, 6, 4, 5]);
});

test('opens one short isolated session per APK wave and maps each requested pool to its source spawn', async () => {
  for (const sourceWave of lostCityCampaignWaves) {
    const selectedWave = { ...sourceWave, number: 1, delayMs: 0 };
    const scenario = makeRulesContent([selectedWave]);
    const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
      scenarioId: scenario.id,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: sourceWave.number + 91,
    });
    try {
      const initial = session.observe();
      assert.equal(initial.wave?.number, 1);
      assert.equal(initial.wave?.totalWaves, 1);
      assert.equal(initial.wave?.lives, 25);
      assert.equal(initial.wave?.cash, 350);
      assert.equal(initial.enemies.length, 0);

      const firstTick = session.advance({ deltaMs: 100 });
      assert.ok(firstTick.enemies.length > 0, `wave ${sourceWave.number} starts after its source delay`);
      const expectedSpawnPointIds = sourceWave.spawnPools
        .filter(({ requests }) => requests.some((count) => count > 0))
        .map(({ spawnPointId }) => spawnPointId)
        .sort((left, right) => left - right);
      const spawnedPointIds = firstTick.events
        .filter((event) => event.type === 'enemy-group-spawned')
        .map(({ spawnPointId }) => spawnPointId)
        .sort((left, right) => left - right);
      assert.deepEqual(spawnedPointIds, expectedSpawnPointIds, `wave ${sourceWave.number} pool IDs map to source spawns`);
    } finally {
      session.close();
    }
  }
});

test('keeps the original 15-second opening delay before wave one spawns', async () => {
  const content = makeRulesContent(lostCityCampaignWaves);
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 27,
  });
  try {
    let view = session.observe();
    for (let frame = 0; frame < 150; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.enemies.length, 0);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.enemies.length > 0);
  } finally {
    session.close();
  }
});

test('settles a ten-wave no-spawn fixture with the expected free-play result shape', async () => {
  const emptyWaves = lostCityCampaignWaves.map((wave) => ({
    ...wave,
    spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: Array.from({ length: 10 }, () => 0) })),
  }));
  const content = makeRulesContent(emptyWaves);
  const game = createGame({ scenarios: { [content.id]: content } });
  const session = await game.open({
    scenarioId: content.id,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 27,
  });
  try {
    for (let frame = 0; frame < 12 && !session.terminalRecord(); frame += 1) {
      session.advance({ deltaMs: 0 });
    }
    const settlement = session.terminalRecord();
    assert.equal(settlement?.outcome, 'victory');
    assert.equal(settlement?.mode, 'free');
    assert.equal(settlement?.waveNumber, 10);
    assert.ok(Number.isSafeInteger(settlement?.highScoreCandidate));
  } finally {
    session.close();
  }
});
