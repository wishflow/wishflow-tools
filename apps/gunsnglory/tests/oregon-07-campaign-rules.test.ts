import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-07.json';
import {
  oregon07BonusCratePool,
  oregon07CampaignAwesomeEnemyTypeThreshold,
  oregon07BaseEnemy,
  oregon07EnemyByType,
  oregon07MaxUpgrades,
  oregon07PreviewWave,
} from '../src/content/oregon-07-campaign-rules';
import { oregon07CampaignWaves } from '../src/content/oregon-07-campaign-waves';
import { createOregon07Dynamite } from '../src/content/oregon-07-dynamite';
import { createOregon07MapContent } from '../src/content/oregon-07-map-entities';
import { oregon07RouteDefinitions, oregon07SpawnPointIdByActionId } from '../src/content/oregon-07-routes';
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

const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 100, speedMultiplierPercent: 120,
    pools: [{ actionId: 3, intervalMs: 2_000, counts: [2, 2, 2, 3, 2, 2, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 110, speedMultiplierPercent: 125,
    pools: [{ actionId: 3, intervalMs: 2_000, counts: [1, 1, 2, 3, 4, 3, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 130,
    pools: [
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 2, 3, 4, 3, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 1, 2, 3, 3, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 135,
    pools: [
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 2, 3, 4, 3, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 1, 2, 3, 3, 3, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 140,
    pools: [
      { actionId: 3, intervalMs: 2_500, counts: [0, 0, 2, 3, 4, 2, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 0, 2, 3, 3, 3, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 1, 1, 3, 3, 2, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 145,
    pools: [
      { actionId: 3, intervalMs: 2_500, counts: [2, 1, 6, 8, 1, 1, 0, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 2, 6, 7, 1, 0, 0, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 4, 5, 7, 1, 1, 0, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 150,
    pools: [{ actionId: 0, intervalMs: 2_500, counts: [1, 1, 2, 3, 3, 3, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 155,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [1, 0, 2, 3, 3, 4, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 0, 1, 3, 3, 3, 2, 1] },
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 2, 3, 3, 3, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 160,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 1, 2, 3, 3, 3, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 0, 2, 3, 3, 4, 1, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 0, 1, 3, 3, 3, 2, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 1, 2, 3, 3, 3, 2, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 165,
    pools: [{ actionId: 2, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
      const spawnPointId = oregon07SpawnPointIdByActionId[actionId];
      assert.notEqual(spawnPointId, undefined, `wave ${index + 1} APK action ${actionId} has a route`);
      return [spawnPointId, intervalMs, [...counts, 0, bossCount]] as const;
    }),
  }));
}

function createRulesScenario(): ScenarioContent {
  const mapContent = createOregon07MapContent(() => true);
  return {
    id: 'mount-hood-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Mount Hood', zh: '胡德山' },
    map: mapContent.scene,
    originalTileGrid: map.originalTileGrid,
    units: mapContent.units,
    maxUpgrades: oregon07MaxUpgrades,
    previewWave: oregon07PreviewWave,
    campaignWaveCount: oregon07CampaignWaves.length,
    campaignWaves: oregon07CampaignWaves,
    campaignBonusCratePool: oregon07BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: oregon07CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: oregon07BaseEnemy,
    campaignEnemyByType: oregon07EnemyByType,
    dynamite: createOregon07Dynamite([]),
  };
}

test('Mount Hood initial economy, upgrades, difficulty, route context, and all APK wave requests match', () => {
  assert.equal(oregon07MaxUpgrades, 3);
  assert.equal(oregon07PreviewWave.initialCash, 500);
  assert.equal(oregon07PreviewWave.initialLives, 25);
  assert.deepEqual(oregon07PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 86, medium: 115, hard: 175,
  });
  assert.deepEqual({
    baseEnemySpeed: oregon07PreviewWave.baseEnemySpeed,
    speedMultiplierMin: oregon07PreviewWave.speedMultiplierMin,
    speedMultiplierCount: oregon07PreviewWave.speedMultiplierCount,
    escapePenalty: oregon07PreviewWave.escapePenalty,
  }, { baseEnemySpeed: 500, speedMultiplierMin: 90, speedMultiplierCount: 20, escapePenalty: 1 });
  assert.deepEqual(oregon07BaseEnemy, {
    hitPoints: 18,
    cashReward: 1,
    penetration: { light: 100, fire: 50, heavy: 25, poison: 75 },
  });
  assert.deepEqual(oregon07BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(oregon07CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(oregon07PreviewWave.routes, oregon07RouteDefinitions);
  assert.deepEqual(Object.keys(oregon07SpawnPointIdByActionId).map(Number).sort(), [0, 1, 2, 3]);
  assert.deepEqual(oregon07CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(oregon07CampaignWaves.length, 10);
  assert.equal(oregon07CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 21);
  assert.ok(oregon07CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.deepEqual(oregon07CampaignWaves[9]?.spawnPools[0]?.requests, [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    'final wave keeps its boss in the original boss slot');
});

test('Mount Hood GameSession opens with APK economy and spawns the first source-ordered wave route', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 27_027,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 10);
    assert.equal(view.wave?.cash, 500);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);

    let firstPoolSpawn: number | undefined;
    for (let frame = 0; frame < 300 && firstPoolSpawn === undefined; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const spawnEvent = view.events.find((event) => event.type === 'enemy-group-spawned');
      if (spawnEvent?.type === 'enemy-group-spawned') firstPoolSpawn = spawnEvent.spawnPointId;
    }
    assert.equal(firstPoolSpawn, oregon07SpawnPointIdByActionId[3]);
    assert.ok(view.enemies.length > 0, 'a short deterministic step creates the first APK wave enemy');
  } finally {
    session.close();
  }
});
