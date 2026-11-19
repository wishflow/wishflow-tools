import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import {
  dakota05BaseEnemy,
  dakota05BonusCratePool,
  dakota05CampaignAwesomeEnemyTypeThreshold,
  dakota05EnemyByType,
  dakota05MaxUpgrades,
  dakota05PreviewWave,
} from '../src/content/dakota-05-campaign-rules';
import { dakota05CampaignSpawnRequestCount, dakota05CampaignWaves } from '../src/content/dakota-05-campaign-waves';
import { dakota05SpawnPointIdByActionId } from '../src/content/dakota-05-routes';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import { createDakota05MapUnits } from '../src/content/dakota-05-units';
import { createDakota05SteamerUnits } from '../src/content/dakota-05-steamer';
import { createDakota05TrainUnits } from '../src/content/dakota-05-trains';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedPool {
  actionId: number;
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

// Independent expected rows transcribed from GT-WAVES in the static APK audit.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 120,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [2, 3, 4, 5, 4, 3, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 125,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [1, 2, 4, 5, 3, 2, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 5, 3, 3, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 4, 5, 3, 4, 2, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 5, 3, 3, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 4, 5, 2, 3, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 140,
    pools: [{ actionId: 2, intervalMs: 2_500, counts: [1, 2, 4, 5, 4, 2, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 155, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 2, 4, 5, 5, 4, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 4, 5, 3, 4, 2, 0] },
      { actionId: 2, intervalMs: 3_000, counts: [1, 1, 3, 5, 3, 3, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 2, 4, 5, 3, 4, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 4, 5, 2, 4, 2, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 1, 3, 5, 3, 3, 2, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 2, 3, 4, 3, 3, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 4, 4, 3, 4, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 0, 4, 4, 2, 4, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 0, 3, 4, 4, 4, 2, 1] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 1, 3, 4, 3, 4, 2, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 160,
    pools: [{ actionId: 0, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
    spawnPools: pools.map(({ actionId, intervalMs, counts, bossCount = 0, docCount = 0 }) => (
      [dakota05SpawnPointIdByActionId[actionId], intervalMs, [...counts, bossCount, docCount]] as const
    )),
  }));
}

function createRulesScenario(campaignWaves: readonly CampaignWaveDefinition[] = dakota05CampaignWaves): ScenarioContent {
  return {
    id: 'ghost-town-waves-test',
    formalSettlementSupported: true,
    title: { en: 'Ghost Town', zh: '幽灵镇' },
    map: createDakota05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...createDakota05MapUnits(), ...createDakota05TrainUnits(), ...createDakota05SteamerUnits()],
    maxUpgrades: dakota05MaxUpgrades,
    previewWave: dakota05PreviewWave,
    campaignWaveCount: dakota05CampaignWaves.length,
    campaignWaves,
    campaignBonusCratePool: dakota05BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota05CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota05BaseEnemy,
    campaignEnemyByType: dakota05EnemyByType,
  };
}

test('Ghost Town stores all nine source waves and nineteen APK enemy requests exactly', () => {
  assert.equal(dakota05CampaignWaves.length, 9);
  assert.equal(dakota05CampaignSpawnRequestCount, 19);
  assert.deepEqual(dakota05CampaignWaves.map(waveShape), expectedWaves());
  assert.ok(dakota05CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota05CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)),
    'all waves leave the Doc request slot empty');
  assert.deepEqual(dakota05CampaignWaves[8]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 9 places its one Boss in request index 8');
});

test('Ghost Town Wave 1 spawns from the APK action-1 entrance in a short GameSession', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_535,
  });

  try {
    assert.equal(session.observe().wave?.pendingSpawnRequests, 21);
    let firstSpawn: { spawnPointId: number; requestType: number; waveNumber: number } | undefined;
    for (let frame = 0; frame < 220 && firstSpawn === undefined; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned' && event.waveNumber === 1) firstSpawn = event;
    }
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.waveNumber, 1);
    assert.equal(firstSpawn.spawnPointId, dakota05SpawnPointIdByActionId[1]);
    assert.equal(firstSpawn.spawnPointId, 1, 'APK wave 1 action 1 maps to Ghost Town route row 1');
    assert.ok(firstSpawn.requestType >= 1 && firstSpawn.requestType <= 8,
      'the request vector selects a remaining ordinary type, without promising fixed type order');
  } finally {
    session.close();
  }
});

test('Ghost Town Wave 9 short probe creates the APK Boss slot and leaves the Doc slot empty', async () => {
  const bossProbeWaves = dakota05CampaignWaves.map((wave, index) => index === 8
    ? { ...wave, delayMs: 0 }
    : { ...wave, delayMs: 0, spawnPools: [] });
  const scenario = createRulesScenario(bossProbeWaves);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_509,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 50 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.equal(view.wave?.number, 9);
    assert.equal(view.wave?.totalWaves, 9);
    assert.ok(boss);
    assert.equal(boss.asset, 'boss');
    assert.equal(view.enemies.filter(({ type }) => type === 8).length, 0);
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned'
      && event.waveNumber === 9 && event.spawnPointId === dakota05SpawnPointIdByActionId[0]
      && event.requestType === 7 && event.groupSize === 1));
  } finally {
    session.close();
  }
});
