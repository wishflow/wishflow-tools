import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-07.json';
import {
  dakota07BaseEnemy,
  dakota07BonusCratePool,
  dakota07CampaignAwesomeEnemyTypeThreshold,
  dakota07EnemyByType,
  dakota07MaxUpgrades,
  dakota07PreviewWave,
} from '../src/content/dakota-07-campaign-rules';
import {
  dakota07CampaignSpawnRequestCount,
  dakota07CampaignWaves,
} from '../src/content/dakota-07-campaign-waves';
import { dakota07SpawnPointIdByActionId } from '../src/content/dakota-07-routes';
import { createDakota07MapScene } from '../src/content/dakota-07-scene';
import { createDakota07MapUnits } from '../src/content/dakota-07-units';
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

// Independent expectation transcribed from the Frost Station static APK audit.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 130, speedMultiplierPercent: 120,
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [2, 3, 3, 5, 2, 4, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 125,
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [1, 3, 4, 5, 2, 3, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 130,
    pools: [0, 1].map((actionId) => ({ actionId, intervalMs: 2_500, counts: [0, 2, 4, 5, 4, 3, 1, 0] })) },
  { delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    pools: [0, 1].map((actionId) => ({ actionId, intervalMs: 2_000, counts: [0, 2, 4, 7, 1, 0, 0, 0] })) },
  { delayMs: 25_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 2, 3, 3, 2, 4, 3, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 2, 3, 3, 2, 4, 3, 0] },
      { actionId: 2, intervalMs: 3_000, counts: [0, 2, 3, 2, 1, 3, 2, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 205, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 3, 3, 2, 4, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 1, 2, 3, 2, 4, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 3, 2, 1, 3, 2, 0] },
      { actionId: 3, intervalMs: 3_000, counts: [1, 1, 3, 2, 1, 3, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 0, 3, 3, 2, 4, 3, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 0, 2, 3, 2, 4, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 3, 2, 3, 5, 3, 1] },
      { actionId: 3, intervalMs: 3_000, counts: [0, 1, 3, 2, 3, 6, 3, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 230, speedMultiplierPercent: 160,
    pools: [{ actionId: 1, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
];

// This table is transcribed from the four raw40–43 spawn markers, not the production route factory.
const expectedSpawnPointByActionId = { 0: 0, 1: 1, 2: 2, 3: 3 } as const;

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
    spawnPools: pools.map(({ actionId, intervalMs, counts, bossCount = 0 }) => (
      [expectedSpawnPointByActionId[actionId as keyof typeof expectedSpawnPointByActionId], intervalMs,
        [...counts, bossCount, 0]] as const
    )),
  }));
}

function createWaveScenario(campaignWaves: readonly CampaignWaveDefinition[] = dakota07CampaignWaves): ScenarioContent {
  return {
    id: 'frost-station-wave-test',
    formalSettlementSupported: true,
    title: { en: 'Frost Station', zh: '霜冻车站' },
    map: createDakota07MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota07MapUnits(),
    maxUpgrades: dakota07MaxUpgrades,
    previewWave: dakota07PreviewWave,
    campaignWaveCount: dakota07CampaignWaves.length,
    campaignWaves,
    campaignBonusCratePool: dakota07BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota07CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota07BaseEnemy,
    campaignEnemyByType: dakota07EnemyByType,
  };
}

test('Frost Station stores all eight APK waves, eighteen requests and exact action mappings', () => {
  assert.deepEqual(dakota07SpawnPointIdByActionId, expectedSpawnPointByActionId);
  assert.equal(dakota07CampaignWaves.length, 8);
  assert.equal(dakota07CampaignSpawnRequestCount, 18);
  assert.deepEqual(dakota07CampaignWaves.map(waveShape), expectedWaves());
  assert.ok(dakota07CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota07CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)),
    'the Doc request slot stays empty in every APK wave');
  assert.deepEqual(dakota07CampaignWaves[7]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 8 requests one Boss and no Doc');
});

test('Frost Station short GameSession dispatches four APK spawn actions to their TDM spawn points', async () => {
  const mappingProbeWave: CampaignWaveDefinition = {
    ...dakota07CampaignWaves[0]!,
    delayMs: 0,
    spawnPools: [0, 1, 2, 3].map((spawnPointId) => ({
      spawnPointId,
      intervalMs: 500,
      requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    })),
  };
  const session = await createGame({ scenarios: { 'frost-station-wave-test': createWaveScenario([
    mappingProbeWave,
    ...dakota07CampaignWaves.slice(1),
  ]) } }).open({
    scenarioId: 'frost-station-wave-test', mode: 'free', difficulty: 'medium', randomSeed: 3_737,
  });

  try {
    const events = new Map<number, number>();
    for (let frame = 0; frame < 6 && events.size < 4; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      for (const event of view.events) {
        if (event.type === 'enemy-group-spawned' && event.waveNumber === 1) {
          events.set(event.spawnPointId, event.requestType);
        }
      }
    }
    assert.deepEqual([...events.keys()].sort((a, b) => a - b), [0, 1, 2, 3]);
    assert.ok([...events.values()].every((requestType) => requestType === 2),
      'the first ordinary request slot produces the APK type 2 settler group');
  } finally {
    session.close();
  }
});

test('Frost Station Wave 8 short GameSession creates one Boss without a Doc', async () => {
  const bossProbeWaves = dakota07CampaignWaves.map((wave, index) => index === 7
    ? { ...wave, delayMs: 0 }
    : { ...wave, delayMs: 0, spawnPools: [] });
  const scenario = createWaveScenario(bossProbeWaves);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id, mode: 'free', difficulty: 'medium', randomSeed: 3_738,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 24 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.equal(view.wave?.number, 8);
    assert.equal(view.wave?.totalWaves, 8);
    assert.ok(boss);
    assert.equal(boss.asset, 'boss');
    assert.equal(view.enemies.filter(({ type }) => type === 8).length, 0);
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned'
      && event.waveNumber === 8
      && event.spawnPointId === expectedSpawnPointByActionId[1]
      && event.requestType === 7
      && event.groupSize === 1));
  } finally {
    session.close();
  }
});
