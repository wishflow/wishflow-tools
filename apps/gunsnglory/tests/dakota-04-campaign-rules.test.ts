import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-04.json';
import {
  dakota04BaseEnemy,
  dakota04BonusCratePool,
  dakota04CampaignAwesomeEnemyTypeThreshold,
  dakota04EnemyByType,
  dakota04LevelParameters,
  dakota04MaxUpgrades,
  dakota04PreviewWave,
} from '../src/content/dakota-04-campaign-rules';
import {
  dakota04CampaignSpawnRequestCount,
  dakota04CampaignWaves,
} from '../src/content/dakota-04-campaign-waves';
import { dakota04SpawnPointIdByActionId } from '../src/content/dakota-04-routes';
import { createDakota04MapScene } from '../src/content/dakota-04-scene';
import { createDakota04MapUnits } from '../src/content/dakota-04-units';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedPool {
  spawnPointId: number;
  intervalMs: number;
  counts: readonly number[];
  bossCount?: number;
  docCount?: number;
}

interface ExpectedWave {
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  pools: readonly ExpectedPool[];
}

// Independent expectations transcribed from Badlands' original TDM and APK branch audit.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 120,
    pools: [{ spawnPointId: 0, intervalMs: 2_000, counts: [2, 3, 4, 5, 3, 2, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    pools: [{ spawnPointId: 0, intervalMs: 2_000, counts: [2, 3, 4, 5, 3, 2, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 130,
    pools: [{ spawnPointId: 0, intervalMs: 2_000, counts: [2, 2, 4, 5, 3, 2, 2, 1] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 135,
    pools: [{ spawnPointId: 1, intervalMs: 2_000, counts: [2, 2, 4, 5, 3, 2, 2, 1] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 140,
    pools: [
      { spawnPointId: 0, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 3, 2, 1] },
      { spawnPointId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 3, 2, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 145,
    pools: [
      { spawnPointId: 0, intervalMs: 2_500, counts: [1, 2, 3, 4, 3, 3, 3, 2] },
      { spawnPointId: 1, intervalMs: 2_500, counts: [2, 1, 2, 3, 3, 3, 2, 3] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 150,
    pools: [{ spawnPointId: 2, intervalMs: 2_500, counts: [1, 2, 3, 4, 3, 4, 3, 2] }] },
  { delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 155,
    pools: [
      { spawnPointId: 0, intervalMs: 2_500, counts: [0, 0, 2, 3, 2, 4, 3, 2] },
      { spawnPointId: 1, intervalMs: 2_500, counts: [0, 0, 2, 3, 2, 4, 3, 2] },
      { spawnPointId: 2, intervalMs: 2_500, counts: [0, 0, 2, 3, 2, 4, 3, 2] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 145,
    pools: [{ spawnPointId: 0, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
    spawnPools: pools.map(({ spawnPointId, intervalMs, counts, bossCount = 0, docCount = 0 }) => (
      [spawnPointId, intervalMs, [...counts, bossCount, docCount]] as const
    )),
  }));
}

function createRulesScenario(campaignWaves: readonly CampaignWaveDefinition[] = dakota04CampaignWaves): ScenarioContent {
  return {
    id: 'badlands-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Badlands', zh: '荒原' },
    map: createDakota04MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota04MapUnits(),
    maxUpgrades: dakota04MaxUpgrades,
    previewWave: dakota04PreviewWave,
    campaignWaveCount: dakota04CampaignWaves.length,
    campaignWaves,
    campaignBonusCratePool: dakota04BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota04CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota04BaseEnemy,
    campaignEnemyByType: dakota04EnemyByType,
  };
}

test('Badlands preserves all twelve GameDesignData values and nine APK waves', () => {
  assert.deepEqual(dakota04LevelParameters, {
    initialCash: 300,
    initialLives: 25,
    maxChests: 999,
    chestTimeMs: 25_000,
    maxUpgrades: 3,
    awesomeMessageMinMs: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 110 },
    gamblerTimeMs: 119_000,
  });
  assert.equal(dakota04MaxUpgrades, 3);
  assert.deepEqual(dakota04PreviewWave.enemyHitPointMultiplierPercentByDifficulty, { easy: 56, medium: 75, hard: 110 });
  assert.deepEqual(dakota04BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(dakota04CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(dakota04SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2 });
  assert.equal(dakota04PreviewWave.routes?.length, 37, 'all APK-derived route chains remain available to the campaign scene');
  assert.equal((dakota04PreviewWave.additionalSpawns?.length ?? 0) + 1, 3, 'three unique spawn markers become campaign entry points');
  assert.equal(dakota04PreviewWave.enemy, dakota04BaseEnemy);
  assert.equal(dakota04CampaignWaves.length, 9);
  assert.equal(dakota04CampaignSpawnRequestCount, 13);
  assert.deepEqual(dakota04CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(dakota04CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 13);
  assert.ok(dakota04CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota04CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)));
  assert.deepEqual(dakota04CampaignWaves[8]?.spawnPools[0]?.requests, [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    'Wave 9 puts its one Boss in APK slot 10/request index 8 and leaves Doc slot 11 empty');

  const scenario = createRulesScenario();
  assert.equal(scenario.campaignUnitPool, undefined, 'the APK defines no player spawn-pool actions for Badlands');
  assert.equal(scenario.gambler, undefined, 'a nonzero Gambler timer does not create a Gambler without TDM markers');
  assert.ok(!scenario.units.some(({ type }) => type === 'gambler'));
  assert.ok(!(scenario.map.decorations ?? []).some(({ asset }) => asset === 'b_3x2_casino'));
});

test('Badlands GameSession opens with the source economy and consumes a short Wave 1 spawn', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3404,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
    assert.equal(view.wave?.pendingSpawnRequests, 20);
    assert.equal(view.wave?.cash, 300);
    assert.equal(view.wave?.lives, 25);
    assert.equal(view.wave?.maxLives, 25);
    assert.equal(view.bonusCratePool?.remainingCount, 999);
    assert.equal(view.bonusCratePool?.remainingMs, 25_000);
    assert.ok(!view.units.some(({ type }) => type === 'gambler'));

    let firstSpawn: { spawnPointId: number; requestType: number; waveNumber: number } | undefined;
    for (let frame = 0; frame < 200 && firstSpawn === undefined; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned') firstSpawn = event;
    }
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.waveNumber, 1);
    assert.equal(firstSpawn.spawnPointId, 0, 'Wave 1 APK action 0 maps to the first row-major spawn');
    assert.ok(firstSpawn.requestType >= 1 && firstSpawn.requestType <= 8);
  } finally {
    session.close();
  }
});

test('Badlands final APK Boss slot creates one Boss and no Doc in a short GameSession probe', async () => {
  const bossProbeWaves = dakota04CampaignWaves.map((wave, index) => index === 8
    ? { ...wave, delayMs: 0 }
    : { ...wave, delayMs: 0, spawnPools: [] });
  const scenario = createRulesScenario(bossProbeWaves);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 34_009,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 40 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.equal(view.wave?.number, 9);
    assert.equal(view.wave?.totalWaves, 9);
    assert.ok(boss);
    assert.equal(boss.asset, 'boss');
    assert.equal(view.enemies.filter(({ type }) => type === 8).length, 0, 'Doc slot remains empty');
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned'
      && event.waveNumber === 9 && event.spawnPointId === 0 && event.requestType === 7 && event.groupSize === 1));
  } finally {
    session.close();
  }
});
