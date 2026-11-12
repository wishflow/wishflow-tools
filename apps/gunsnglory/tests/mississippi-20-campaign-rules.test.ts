import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/mississippi-20.json';
import { createMississippi20MapScene } from '../src/content/mississippi-20-scene';
import { createMississippi20MapUnits } from '../src/content/mississippi-20-units';
import { mississippi20CampaignUnitPool } from '../src/content/mississippi-20-unit-pool';
import {
  mississippi20BonusCratePool,
  mississippi20CampaignAwesomeEnemyTypeThreshold,
  mississippi20BaseEnemy,
  mississippi20EnemyByType,
  mississippi20MaxUpgrades,
  mississippi20PreviewWave,
} from '../src/content/mississippi-20-campaign-rules';
import { mississippi20CampaignWaves } from '../src/content/mississippi-20-campaign-waves';
import { mississippi20RouteDefinitions } from '../src/content/mississippi-20-routes';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedVectors = [
  [0, 0, 0, 0, 4, 0, 0, 0],
  [0, 0, 0, 0, 4, 1, 0, 0],
  [0, 0, 0, 0, 4, 2, 1, 0],
  [0, 0, 0, 0, 5, 3, 2, 0],
  [0, 0, 0, 0, 5, 4, 3, 0],
  [0, 0, 0, 0, 5, 4, 3, 1],
  [0, 0, 0, 0, 5, 5, 4, 1],
  [0, 0, 0, 0, 5, 5, 5, 1],
] as const;
const expectedWaveMetadata = [
  [15_000, 175, 150, 2_000], [5_000, 200, 160, 2_000],
  [5_000, 225, 170, 2_500], [5_000, 250, 180, 2_000],
  [5_000, 250, 190, 2_000], [5_000, 275, 200, 2_500],
  [5_000, 275, 210, 2_500], [5_000, 300, 250, 3_500],
] as const;

function waveShape(wave: CampaignWaveDefinition) {
  return {
    number: wave.number,
    delayMs: wave.delayMs,
    hitPointMultiplierPercent: wave.hitPointMultiplierPercent,
    speedMultiplierPercent: wave.speedMultiplierPercent,
    spawnPools: wave.spawnPools.map(({ spawnPointId, intervalMs, requests }) => [spawnPointId, intervalMs, requests] as const),
  };
}

function expectedWaves(): ExpectedWave[] {
  return expectedWaveMetadata.map(([delayMs, hitPoints, speed, intervalMs], index) => ({
    number: index + 1,
    delayMs,
    hitPointMultiplierPercent: hitPoints,
    speedMultiplierPercent: speed,
    spawnPools: [0, 1].map((actionId) => [
      actionId,
      intervalMs,
      [...expectedVectors[index]!, 0, 0],
    ] as const),
  }));
}

function createRulesScenario(): ScenarioContent {
  return {
    id: 'horse-hills-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Horse Hills', zh: '马丘陵' },
    map: createMississippi20MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi20MapUnits(),
    maxUpgrades: mississippi20MaxUpgrades,
    previewWave: mississippi20PreviewWave,
    campaignWaveCount: mississippi20CampaignWaves.length,
    campaignWaves: mississippi20CampaignWaves,
    campaignUnitPool: mississippi20CampaignUnitPool,
    campaignBonusCratePool: mississippi20BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi20CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi20BaseEnemy,
    campaignEnemyByType: mississippi20EnemyByType,
  };
}

test('Horse Hills matches APK initial state, difficulty, bonus crates, and eight source waves', () => {
  assert.equal(mississippi20MaxUpgrades, 3);
  assert.equal(mississippi20PreviewWave.initialCash, 450);
  assert.equal(mississippi20PreviewWave.initialLives, 1);
  assert.deepEqual(mississippi20PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 100, hard: 110,
  });
  assert.deepEqual(mississippi20BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 12, rewardTypeCount: 4,
  });
  assert.equal(mississippi20CampaignAwesomeEnemyTypeThreshold, 5);
  assert.equal(mississippi20RouteDefinitions.length, 4);
  assert.deepEqual(mississippi20PreviewWave.routes, mississippi20RouteDefinitions);
  assert.deepEqual(mississippi20CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(mississippi20CampaignWaves.length, 8);
  assert.equal(mississippi20CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 16);
  assert.ok(mississippi20CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('Horse Hills wave-two Tipi pool actions set the APK Indian count and maximum', () => {
  assert.deepEqual(mississippi20CampaignUnitPool.actions, [
    { waveNumber: 2, action: 'set', values: [{ poolType: 4, count: 2 }] },
    { waveNumber: 2, action: 'set-max', values: [{ poolType: 4, count: 4 }] },
  ]);
  const runtime = createCampaignUnitPoolRuntime(mississippi20CampaignUnitPool)!;
  applyCampaignUnitPoolActions(runtime, mississippi20CampaignUnitPool, 2);
  assert.equal(runtime.pending[4], 2);
  assert.equal(runtime.maximum[4], 4);
  assert.equal(runtime.pending.filter((count) => count > 0).length, 1);
  assert.equal(runtime.maximum.filter((count) => count > 0).length, 1);
});

test('Horse Hills GameSession spawns a pool Indian only at its real Tipi in wave two', async () => {
  const scenario = createRulesScenario();
  assert.ok(!scenario.units.some(({ type, activity }) => type === 'indian' && activity === 5));
  scenario.campaignWaves = mississippi20CampaignWaves.map((wave, index) => ({
    ...wave,
    delayMs: 0,
    spawnPools: index === 1 ? [{
      spawnPointId: 0,
      intervalMs: 100_000,
      requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }] : [],
  }));
  scenario.campaignUnitPool = { ...mississippi20CampaignUnitPool, intervalMs: 100 };

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2020,
  });
  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.cash, 450);
    assert.equal(view.wave?.lives, 1);
    for (let frame = 0; frame < 10 && view.wave?.number !== 2; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    assert.equal(view.wave?.number, 2);
    assert.equal(view.wave?.totalWaves, 8);

    for (let frame = 0; frame < 80 && !view.units.some(({ type, activity }) => type === 'indian' && activity === 2); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawnedIndian = view.units.find(({ type, activity }) => type === 'indian' && activity === 2);
    assert.ok(spawnedIndian, 'wave two should release an active Indian from the pool');
    assert.equal(spawnedIndian.asset, 'player_indian');
    assert.deepEqual(spawnedIndian.cell, { x: 28, y: 17 });
  } finally {
    session.close();
  }
});
