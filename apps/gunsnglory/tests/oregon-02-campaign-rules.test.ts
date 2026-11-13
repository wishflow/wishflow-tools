import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-02.json';
import { createOregon02MapContent } from '../src/content/oregon-02-map-entities';
import {
  oregon02BonusCratePool,
  oregon02CampaignAwesomeEnemyTypeThreshold,
  oregon02BaseEnemy,
  oregon02EnemyByType,
  oregon02MaxUpgrades,
  oregon02PreviewWave,
} from '../src/content/oregon-02-campaign-rules';
import { oregon02CampaignWaves } from '../src/content/oregon-02-campaign-waves';
import { oregon02RouteDefinitions, oregon02SpawnPointIdByActionId } from '../src/content/oregon-02-routes';
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

const maxNumPointsIntervalMs = 3_000;
const expectedWaveRows: readonly ExpectedWave[] = [
  {
    delayMs: 15_000, hitPointMultiplierPercent: 90, speedMultiplierPercent: 120,
    pools: [{ actionId: 5, intervalMs: 2_500, counts: [1, 1, 3, 2, 1, 2, 0, 0] }],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    pools: [{ actionId: 4, intervalMs: 2_500, counts: [0, 0, 2, 1, 2, 1, 1, 0] }],
  },
  {
    delayMs: 20_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    pools: [
      { actionId: 3, intervalMs: 3_500, counts: [0, 0, 2, 3, 1, 1, 0, 0] },
      { actionId: 4, intervalMs: 3_500, counts: [0, 0, 2, 1, 2, 1, 0, 0] },
      { actionId: 5, intervalMs: 3_500, counts: [0, 0, 3, 3, 2, 1, 0, 0] },
    ],
  },
  {
    delayMs: 20_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 125,
    pools: [
      { actionId: 2, intervalMs: 3_500, counts: [0, 0, 2, 3, 1, 1, 0, 0] },
      { actionId: 3, intervalMs: 4_000, counts: [0, 0, 1, 2, 0, 1, 0, 0] },
      { actionId: 4, intervalMs: 3_500, counts: [0, 0, 2, 1, 2, 1, 0, 0] },
      { actionId: 5, intervalMs: 3_500, counts: [0, 0, 3, 3, 2, 1, 0, 0] },
    ],
  },
  {
    delayMs: 20_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 130,
    pools: [
      { actionId: 1, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 2, 3, 1, 1, 0, 0] },
      { actionId: 2, intervalMs: 3_250, counts: [0, 0, 2, 3, 1, 1, 0, 0] },
      { actionId: 3, intervalMs: 3_500, counts: [0, 0, 1, 2, 0, 1, 0, 0] },
      { actionId: 4, intervalMs: 3_250, counts: [0, 0, 2, 1, 2, 1, 0, 0] },
      { actionId: 5, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 3, 3, 2, 1, 0, 0] },
    ],
  },
  {
    delayMs: 20_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: maxNumPointsIntervalMs, counts: [0, 1, 2, 3, 1, 1, 1, 0] },
      { actionId: 1, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 2, 3, 1, 1, 0, 0] },
      { actionId: 2, intervalMs: 3_250, counts: [0, 0, 2, 3, 1, 1, 1, 0] },
      { actionId: 3, intervalMs: 3_500, counts: [0, 0, 1, 2, 0, 1, 0, 0] },
      { actionId: 4, intervalMs: 3_250, counts: [0, 0, 2, 1, 2, 1, 0, 0] },
      { actionId: 5, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 3, 3, 2, 1, 1, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: maxNumPointsIntervalMs, counts: [0, 1, 2, 3, 2, 1, 1, 0] },
      { actionId: 1, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 3, 3, 1, 1, 0, 0] },
      { actionId: 2, intervalMs: 3_250, counts: [0, 0, 2, 3, 2, 1, 1, 0] },
      { actionId: 3, intervalMs: 3_500, counts: [0, 0, 2, 3, 0, 1, 1, 1] },
      { actionId: 4, intervalMs: 3_250, counts: [0, 0, 3, 2, 2, 1, 0, 0] },
      { actionId: 5, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 3, 4, 2, 2, 1, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: maxNumPointsIntervalMs, counts: [0, 1, 3, 3, 2, 1, 1, 1] },
      { actionId: 1, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 2, 3, 1, 1, 0, 1] },
      { actionId: 2, intervalMs: 3_250, counts: [0, 0, 2, 3, 2, 1, 1, 0] },
      { actionId: 3, intervalMs: 3_500, counts: [0, 0, 2, 3, 0, 1, 0, 0] },
      { actionId: 4, intervalMs: 3_250, counts: [0, 0, 3, 2, 2, 1, 1, 1] },
      { actionId: 5, intervalMs: maxNumPointsIntervalMs, counts: [0, 0, 3, 3, 2, 2, 1, 0] },
    ],
  },
  {
    delayMs: 25_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 145,
    pools: [{ actionId: 4, intervalMs: 2_500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }],
  },
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
      const spawnPointId = oregon02SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} action ${actionId} has a route`);
      return [spawnPointId, intervalMs, [...counts, 0, bossCount]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon02MapContent((typeId) => typeId >= 1 && typeId <= 6);
  return {
    id: 'cashcow-canyon-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Cashcow Canyon', zh: '现金峡谷' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon02MaxUpgrades,
    previewWave: oregon02PreviewWave,
    campaignWaveCount: oregon02CampaignWaves.length,
    campaignWaves: oregon02CampaignWaves,
    campaignBonusCratePool: oregon02BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon02CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon02BaseEnemy,
    campaignEnemyByType: oregon02EnemyByType,
  };
}

test('Cashcow Canyon initial rules and all 33 source-ordered wave requests match the APK record', () => {
  assert.equal(oregon02MaxUpgrades, 3);
  assert.equal(oregon02PreviewWave.initialCash, 250);
  assert.equal(oregon02PreviewWave.initialLives, 25);
  assert.deepEqual(oregon02PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 140,
  });
  assert.deepEqual(oregon02BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon02CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon02PreviewWave.routes, oregon02RouteDefinitions);
  assert.deepEqual(oregon02SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 });
  assert.deepEqual(oregon02CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon02CampaignWaves.length, 9);
  assert.equal(oregon02CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 33);
  assert.ok(oregon02CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.equal(oregon02CampaignWaves[8]?.spawnPools[0]?.requests[9], 1, 'wave nine uses the Boss slot');
  assert.equal(createRulesScenario().campaignUnitPool, undefined, 'the map has no spawnPoolActions');
  assert.equal('gambler' in createRulesScenario(), false, 'the map has no Gambler marker');
});

test('Cashcow Canyon GameSession starts with APK values and releases its first Settler from action five', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2222,
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

    for (let frame = 0; frame < 240 && !view.enemies.some(({ type }) => type === 1); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const settler = view.enemies.find(({ type }) => type === 1);
    assert.ok(settler, 'wave one must release its Settler ×1 request');
    assert.equal(settler.asset, 'pioneer_male');
    assert.equal(settler.maxHitPoints, 185);

    const route = oregon02RouteDefinitions.find(({ spawn }) => spawn.cell.x === 0 && spawn.cell.y === 13);
    assert.ok(route, 'APK action five maps to the sixth row-major spawn');
    assert.deepEqual(settler.positionFine, {
      x: (route.spawn.cell.x * 7_680) + 3_840 - 2 * 7_680,
      y: (route.spawn.cell.y * 7_680) + 3_840,
    });
  } finally {
    session.close();
  }
});
