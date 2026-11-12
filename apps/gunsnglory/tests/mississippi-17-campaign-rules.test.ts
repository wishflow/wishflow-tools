import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mississippi17BonusCratePool,
  mississippi17CampaignAwesomeEnemyTypeThreshold,
  mississippi17BaseEnemy,
  mississippi17EnemyByType,
  mississippi17MaxUpgrades,
  mississippi17PreviewWave,
} from '../src/content/mississippi-17-campaign-rules';
import { mississippi17CampaignWaves } from '../src/content/mississippi-17-campaign-waves';
import { createMississippi17MapScene } from '../src/content/mississippi-17-scene';
import { mississippi17RouteDefinitions } from '../src/content/mississippi-17-routes';
import { createMississippi17MapUnits } from '../src/content/mississippi-17-units';
import map from '../src/content/mississippi-17.json';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 100, spawnPools: [[0, 2_000, [1, 1, 2, 3, 0, 0, 0, 0, 0, 0]], [1, 2_000, [1, 1, 2, 3, 0, 0, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 8_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100, spawnPools: [[0, 2_000, [1, 1, 2, 2, 2, 1, 0, 0, 0, 0]], [1, 2_000, [1, 1, 1, 2, 1, 1, 0, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 1, 0, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 100, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 2, 0, 0, 0, 0]], [1, 2_500, [0, 1, 1, 2, 3, 1, 0, 0, 0, 0]], [3, 2_000, [1, 1, 1, 1, 2, 1, 0, 0, 0, 0]]] },
  { number: 4, delayMs: 8_000, hitPointMultiplierPercent: 175, speedMultiplierPercent: 100, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 2, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 3, 1, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 2, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 2, 2, 0, 0, 0, 0]]] },
  { number: 5, delayMs: 5_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]], [5, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 110, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]], [4, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]], [5, 2_000, [1, 1, 1, 2, 3, 2, 1, 0, 0, 0]]] },
  { number: 8, delayMs: 5_000, hitPointMultiplierPercent: 275, speedMultiplierPercent: 110, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [4, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [5, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]]] },
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

function createRuleFixture(): ScenarioContent {
  return {
    id: 'dead-rocks-rule-fixture',
    formalSettlementSupported: true,
    title: { en: 'Dead Rocks', zh: '死亡岩地' },
    map: createMississippi17MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi17MapUnits(),
    maxUpgrades: mississippi17MaxUpgrades,
    previewWave: mississippi17PreviewWave,
    campaignWaveCount: mississippi17CampaignWaves.length,
    campaignWaves: mississippi17CampaignWaves,
    campaignBonusCratePool: mississippi17BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi17CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi17BaseEnemy,
    campaignEnemyByType: mississippi17EnemyByType,
  };
}

test('Dead Rocks matches APK start parameters and all eight wave request tables', () => {
  assert.equal(mississippi17MaxUpgrades, 3);
  assert.equal(mississippi17PreviewWave.initialCash, 365);
  assert.equal(mississippi17PreviewWave.initialLives, 20);
  assert.deepEqual(mississippi17PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 100, hard: 120,
  });
  assert.deepEqual(mississippi17BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 10, rewardTypeCount: 4,
  });
  assert.deepEqual(mississippi17CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi17CampaignWaves.length, 8);
  assert.equal(mississippi17CampaignWaves.reduce((count, wave) => count + wave.spawnPools.length, 0), 35);
  assert.ok(mississippi17CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
  assert.equal(mississippi17RouteDefinitions.length > 0, true);
  assert.deepEqual(mississippi17PreviewWave.routes, mississippi17RouteDefinitions);
});

test('Dead Rocks starts the first wave from APK parameters without a player-unit spawn pool', async () => {
  const scenario = createRuleFixture();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_701,
  });

  try {
    const view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.pendingSpawnRequests, 14);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 20);
    assert.equal(scenario.campaignUnitPool, undefined, 'this map has no Fort or player spawn-pool actions');
    assert.equal(scenario.campaignBonusCratePool?.totalCount, 999);
  } finally {
    session.close();
  }
});
