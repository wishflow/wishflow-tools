import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/mississippi-19.json';
import { createMississippi19MapScene } from '../src/content/mississippi-19-scene';
import { createMississippi19MapUnits } from '../src/content/mississippi-19-units';
import { mississippi19CampaignUnitPool } from '../src/content/mississippi-19-unit-pool';
import {
  mississippi19BonusCratePool,
  mississippi19CampaignAwesomeEnemyTypeThreshold,
  mississippi19BaseEnemy,
  mississippi19EnemyByType,
  mississippi19MaxUpgrades,
  mississippi19PreviewWave,
} from '../src/content/mississippi-19-campaign-rules';
import { mississippi19CampaignWaves } from '../src/content/mississippi-19-campaign-waves';
import { mississippi19RouteDefinitions } from '../src/content/mississippi-19-routes';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 100, spawnPools: [[0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [1, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 105, spawnPools: [[0, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [1, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]]] },
  { number: 4, delayMs: 10_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 115, spawnPools: [[2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 5, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 110, spawnPools: [[0, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]], [1, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 150, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 2, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 2, 0, 0, 0]]] },
  { number: 8, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]]] },
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

function createRulesScenario(): ScenarioContent {
  return {
    id: 'dust-falls-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Dust Falls', zh: '尘瀑镇' },
    map: createMississippi19MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi19MapUnits(),
    maxUpgrades: mississippi19MaxUpgrades,
    previewWave: mississippi19PreviewWave,
    campaignWaveCount: mississippi19CampaignWaves.length,
    campaignWaves: mississippi19CampaignWaves,
    campaignUnitPool: mississippi19CampaignUnitPool,
    campaignBonusCratePool: mississippi19BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi19CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi19BaseEnemy,
    campaignEnemyByType: mississippi19EnemyByType,
  };
}

test('Dust Falls matches the APK start state and all eight request tables', () => {
  assert.equal(mississippi19MaxUpgrades, 3);
  assert.equal(mississippi19PreviewWave.initialCash, 365);
  assert.equal(mississippi19PreviewWave.initialLives, 15);
  assert.deepEqual(mississippi19PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 100, hard: 110,
  });
  assert.deepEqual(mississippi19BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 10, rewardTypeCount: 4,
  });
  assert.equal(mississippi19RouteDefinitions.length, 7);
  assert.equal((mississippi19PreviewWave.additionalSpawns?.length ?? 0) + 1, 4);
  assert.deepEqual(mississippi19PreviewWave.routes, mississippi19RouteDefinitions);
  assert.deepEqual(mississippi19CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi19CampaignWaves.length, 8);
  assert.equal(mississippi19CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 24);
  assert.ok(mississippi19CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('Dust Falls wave-four Tipi pool actions set the APK Indian count and cap', () => {
  assert.deepEqual(mississippi19CampaignUnitPool.actions, [
    { waveNumber: 4, action: 'set', values: [{ poolType: 4, count: 2 }] },
    { waveNumber: 4, action: 'set-max', values: [{ poolType: 4, count: 4 }] },
  ]);
  const runtime = createCampaignUnitPoolRuntime(mississippi19CampaignUnitPool)!;
  applyCampaignUnitPoolActions(runtime, mississippi19CampaignUnitPool, 4);
  assert.equal(runtime.pending[4], 2);
  assert.equal(runtime.maximum[4], 4);
  assert.equal(runtime.pending.filter((count) => count > 0).length, 1);
  assert.equal(runtime.maximum.filter((count) => count > 0).length, 1);
});

test('Dust Falls GameSession spawns a pool Indian only at its real Tipi in wave four', async () => {
  const scenario = createRulesScenario();
  assert.ok(!scenario.units.some(({ type, activity }) => type === 'indian' && activity === 5));
  scenario.campaignWaves = mississippi19CampaignWaves.map((wave, index) => ({
    ...wave,
    delayMs: 0,
    spawnPools: index === 3 ? [{
      spawnPointId: 0,
      intervalMs: 100_000,
      requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }] : [],
  }));
  scenario.campaignUnitPool = { ...mississippi19CampaignUnitPool, intervalMs: 100 };

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1904,
  });
  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 15);
    for (let frame = 0; frame < 10 && view.wave?.number !== 4; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    assert.equal(view.wave?.number, 4);
    assert.equal(view.wave?.totalWaves, 8);

    for (let frame = 0; frame < 80 && !view.units.some(({ type, activity }) => type === 'indian' && activity === 2); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawnedIndian = view.units.find(({ type, activity }) => type === 'indian' && activity === 2);
    assert.ok(spawnedIndian, 'wave four should release an active Indian from the pool');
    assert.equal(spawnedIndian.asset, 'player_indian');
    assert.deepEqual(spawnedIndian.cell, { x: 6, y: 6 });
  } finally {
    session.close();
  }
});
