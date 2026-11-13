import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-01.json';
import { createOregon01MapContent } from '../src/content/oregon-01-map-entities';
import { oregon01RouteDefinitions, oregon01SpawnPointIdByActionId } from '../src/content/oregon-01-routes';
import {
  oregon01BaseEnemy,
  oregon01BonusCratePool,
  oregon01CampaignAwesomeEnemyTypeThreshold,
  oregon01EnemyByType,
  oregon01MaxUpgrades,
  oregon01PreviewWave,
} from '../src/content/oregon-01-campaign-rules';
import { oregon01CampaignWaves } from '../src/content/oregon-01-campaign-waves';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedVectors = [
  [[0, [2, 3, 1, 2, 1, 2, 0, 0]]],
  [[1, [0, 3, 2, 3, 2, 3, 0, 0]]],
  [[0, [0, 0, 2, 3, 2, 1, 1, 0]], [1, [0, 0, 2, 3, 2, 2, 0, 0]]],
  [[2, [0, 0, 2, 3, 2, 2, 0, 0]], [3, [0, 0, 2, 3, 2, 1, 1, 0]]],
  [[2, [0, 0, 0, 5, 2, 1, 1, 0]], [3, [0, 0, 0, 5, 1, 2, 1, 0]]],
  [
    [0, [0, 0, 2, 3, 2, 1, 1, 0]], [1, [0, 0, 2, 3, 1, 2, 0, 0]],
    [2, [0, 0, 2, 3, 2, 1, 1, 0]], [3, [0, 0, 2, 3, 1, 2, 0, 0]],
  ],
  [
    [0, [0, 0, 2, 3, 1, 1, 1, 0]], [1, [0, 0, 2, 3, 2, 2, 2, 0]],
    [2, [0, 0, 2, 3, 1, 1, 1, 0]], [3, [0, 0, 2, 3, 1, 2, 2, 0]],
  ],
  [
    [0, [0, 0, 2, 2, 1, 1, 1, 1]], [1, [0, 0, 2, 2, 2, 2, 2, 0]],
    [2, [0, 0, 2, 2, 1, 1, 1, 0]], [3, [0, 0, 2, 2, 1, 2, 2, 0]],
  ],
] as const;
const expectedWaveMetadata = [
  [15_000, 90, 120], [15_000, 100, 120], [15_000, 110, 125], [20_000, 120, 125],
  [15_000, 130, 130], [20_000, 140, 135], [15_000, 150, 140], [15_000, 160, 145],
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
  return expectedWaveMetadata.map(([delayMs, hitPoints, speed], waveIndex) => ({
    number: waveIndex + 1,
    delayMs,
    hitPointMultiplierPercent: hitPoints,
    speedMultiplierPercent: speed,
    spawnPools: expectedVectors[waveIndex]!.map(([actionId, counts]) => {
      const spawnPointId = oregon01SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${waveIndex + 1} action ${actionId} has a route`);
      return [spawnPointId, 2_500, [...counts, 0, 0]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon01MapContent((typeId) => typeId >= 1 && typeId <= 4);
  return {
    id: 'eastwood-forest-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Eastwood Forest', zh: '东林地' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon01MaxUpgrades,
    previewWave: oregon01PreviewWave,
    campaignWaveCount: oregon01CampaignWaves.length,
    campaignWaves: oregon01CampaignWaves,
    campaignBonusCratePool: oregon01BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon01CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon01BaseEnemy,
    campaignEnemyByType: oregon01EnemyByType,
  };
}

test('Eastwood matches APK start rules and all eight source-ordered waves', () => {
  assert.equal(oregon01MaxUpgrades, 3);
  assert.equal(oregon01PreviewWave.initialCash, 75);
  assert.equal(oregon01PreviewWave.initialLives, 25);
  assert.deepEqual(oregon01PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 140,
  });
  assert.deepEqual(oregon01BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon01CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon01PreviewWave.routes, oregon01RouteDefinitions);
  assert.deepEqual(oregon01SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });
  assert.deepEqual(oregon01CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon01CampaignWaves.length, 8);
  assert.equal(oregon01CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 20);
  assert.ok(oregon01CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
  assert.equal(createRulesScenario().campaignUnitPool, undefined);
});

test('Eastwood GameSession applies the initial state and spawns the first real request from action zero', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2121,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.cash, 75);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    for (let frame = 0; frame < 220 && !view.enemies.some(({ type }) => type === 1); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const settler = view.enemies.find(({ type }) => type === 1);
    assert.ok(settler, 'the first wave must release the APK Settler ×1 request');
    const route = oregon01RouteDefinitions[oregon01SpawnPointIdByActionId[0]!]!;
    const direction = route.spawn.direction === 'west' ? { x: -1, y: 0 }
      : route.spawn.direction === 'east' ? { x: 1, y: 0 }
        : route.spawn.direction === 'north' ? { x: 0, y: -1 } : { x: 0, y: 1 };
    assert.deepEqual(settler.positionFine, {
      x: (route.spawn.cell.x * 7_680) + 3_840 - (direction.x * 2 * 7_680),
      y: (route.spawn.cell.y * 7_680) + 3_840 - (direction.y * 2 * 7_680),
    });
    assert.equal(settler.asset, 'pioneer_male');
    assert.equal(settler.maxHitPoints, 185);
  } finally {
    session.close();
  }
});
