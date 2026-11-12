import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/mississippi-15.json';
import { createMississippi15MapScene } from '../src/content/mississippi-15-scene';
import { createMississippi15SteamerUnits } from '../src/content/mississippi-15-steamer';
import { createMississippi15TrainUnits } from '../src/content/mississippi-15-trains';
import { createMississippi15MapUnits } from '../src/content/mississippi-15-units';
import {
  mississippi15BonusCratePool,
  mississippi15CampaignAwesomeEnemyTypeThreshold,
  mississippi15BaseEnemy,
  mississippi15EnemyByType,
  mississippi15MaxUpgrades,
  mississippi15PreviewWave,
} from '../src/content/mississippi-15-campaign-rules';
import { mississippi15CampaignWaves } from '../src/content/mississippi-15-campaign-waves';
import { mississippi15CampaignUnitPool } from '../src/content/mississippi-15-unit-pool';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime, advanceCampaignUnitPool } from '../src/game/campaign-unit-pool';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 100, spawnPools: [[0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [1, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 105, spawnPools: [[2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 110, spawnPools: [[1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [2, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]]] },
  { number: 4, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 2_500, [0, 1, 1, 1, 2, 3, 2, 0, 0, 0]], [3, 2_500, [1, 2, 1, 2, 3, 3, 2, 0, 0, 0]]] },
  { number: 5, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 110, spawnPools: [[0, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [1, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [2, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [3, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 150, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [3, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]]] },
  { number: 8, delayMs: 10_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 100, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [4, 4_000, [1, 1, 0, 0, 3, 3, 2, 0, 0, 0]], [5, 3_500, [1, 1, 0, 0, 3, 3, 2, 0, 0, 0]]] },
  { number: 9, delayMs: 5_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [4, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [5, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]]] },
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
    id: 'mississippi-15-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Railroad Canyon', zh: '铁路峡谷' },
    map: createMississippi15MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi15TrainUnits(),
      ...createMississippi15SteamerUnits(),
      ...createMississippi15MapUnits(),
    ],
    maxUpgrades: mississippi15MaxUpgrades,
    previewWave: mississippi15PreviewWave,
    campaignWaveCount: mississippi15CampaignWaves.length,
    campaignWaves: mississippi15CampaignWaves,
    campaignUnitPool: mississippi15CampaignUnitPool,
    campaignBonusCratePool: mississippi15BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi15CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi15BaseEnemy,
    campaignEnemyByType: mississippi15EnemyByType,
  };
}

test('Railroad Canyon starts with APK economy, lives, routes, difficulty, and wave-one requests', async () => {
  const scenario = createRulesScenario();
  assert.equal(scenario.maxUpgrades, 3);
  assert.equal(scenario.previewWave?.initialCash, 365);
  assert.equal(scenario.previewWave?.initialLives, 20);
  assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, { easy: 75, medium: 100, hard: 115 });
  assert.equal((scenario.previewWave?.additionalSpawns?.length ?? 0) + 1, 6);
  assert.deepEqual(scenario.campaignBonusCratePool, { totalCount: 999, intervalMs: 25_000, simultaneousLimit: 10, rewardTypeCount: 4 });
  assert.equal(scenario.campaignWaveCount, 9);

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1501,
  });
  try {
    const view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.pendingSpawnRequests, 20);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 20);
  } finally {
    session.close();
  }
});

test('Railroad Canyon GameSession advances into wave two and applies its pool actions', async () => {
  const scenario = createRulesScenario();
  const zeroRequests = Array.from({ length: 10 }, () => 0);
  scenario.campaignWaves = [
    {
      number: 1,
      delayMs: 0,
      hitPointMultiplierPercent: 100,
      speedMultiplierPercent: 100,
      spawnPools: [{ spawnPointId: 0, intervalMs: 100, requests: zeroRequests }],
    },
    mississippi15CampaignWaves[1]!,
  ];

  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 1502,
  });
  try {
    const view = session.advance({ deltaMs: 100 });
    assert.equal(view.wave?.number, 2);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.phase, 'active');
  } finally {
    session.close();
  }
});

test('all nine Railroad Canyon waves retain the APK order, modifiers, intervals, and request slots', () => {
  assert.deepEqual(mississippi15CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi15CampaignWaves.length, 9);
  assert.equal(mississippi15CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 32);
  assert.ok(mississippi15CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('Railroad Canyon wave-two pool recruits from the only Saloon without a fake placed unit', () => {
  assert.deepEqual(mississippi15CampaignUnitPool.spawnLocations, [
    { id: 'saloon', spawnLocationType: 1, cell: { x: 2, y: 9 } },
  ]);
  assert.deepEqual(mississippi15CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => [
    poolType, unitType, spawnLocationType, template,
  ]), [
    [1, 'gunslinger', 1, undefined],
    [2, 'mexican', 1, undefined],
  ]);

  const definition = mississippi15CampaignUnitPool;
  const runtime = createCampaignUnitPoolRuntime(definition)!;
  applyCampaignUnitPoolActions(runtime, definition, 2);
  assert.deepEqual(runtime.pending.slice(1, 3), [1, 1]);
  assert.deepEqual(runtime.maximum.slice(1, 3), [4, 4]);
  assert.equal(runtime.pending.filter((count) => count > 0).length, 2);
  assert.equal(runtime.maximum.filter((count) => count > 0).length, 2);

  const random = { nextInt: (bound: number) => bound === 37 ? 0 : 0 };
  for (let frame = 0; frame < 180; frame += 1) {
    const spawned = advanceCampaignUnitPool(runtime, definition, 100, random, () => false);
    if (spawned.length > 0) {
      assert.equal(spawned[0]?.unitType, 'gunslinger');
      assert.deepEqual(spawned[0]?.cell, { x: 2, y: 9 });
      return;
    }
  }
  assert.fail('the Saloon pool should dispatch its first available Gunslinger');
});
