import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-06.json';
import {
  dakota06BaseEnemy,
  dakota06BonusCratePool,
  dakota06CampaignAwesomeEnemyTypeThreshold,
  dakota06EnemyByType,
  dakota06MaxUpgrades,
  dakota06PreviewWave,
} from '../src/content/dakota-06-campaign-rules';
import { dakota06CampaignSpawnRequestCount, dakota06CampaignWaves } from '../src/content/dakota-06-campaign-waves';
import { createDakota06DynamiteDefinition } from '../src/content/dakota-06-dynamite';
import { dakota06SpawnPointIdByActionId } from '../src/content/dakota-06-routes';
import { createDakota06MapScene } from '../src/content/dakota-06-scene';
import { createDakota06MapUnits } from '../src/content/dakota-06-units';
import { dakota06CampaignUnitPool } from '../src/content/dakota-06-unit-pool';
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

// Independent expected rows transcribed from the Ice Rocks static APK audit.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 120,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [2, 3, 3, 5, 3, 3, 1, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 140, speedMultiplierPercent: 125,
    pools: [{ actionId: 1, intervalMs: 2_000, counts: [1, 2, 4, 5, 4, 3, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 130,
    pools: [{ actionId: 0, intervalMs: 2_000, counts: [1, 2, 4, 5, 4, 3, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 135,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 5, 5, 3, 3, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 3, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 185, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 5, 5, 3, 3, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 3, 1, 0] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 195, speedMultiplierPercent: 150,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 5, 3, 0] },
      { actionId: 2, intervalMs: 3_000, counts: [2, 3, 4, 5, 3, 3, 1, 0] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 5, 5, 3, 5, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [2, 2, 4, 5, 3, 5, 3, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [2, 3, 4, 5, 4, 3, 1, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 220, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 5_000, counts: [0, 0, 0, 0, 0, 0, 0, 2] },
      { actionId: 1, intervalMs: 5_000, counts: [0, 0, 0, 0, 0, 0, 0, 2] },
      { actionId: 2, intervalMs: 6_000, counts: [0, 0, 0, 0, 0, 0, 0, 2] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 205, speedMultiplierPercent: 160,
    pools: [{ actionId: 0, intervalMs: 500, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
];

// Action IDs come from APK TDM markers; this table is independent of the production route module.
const expectedSpawnPointByActionId = { 0: 2, 1: 1, 2: 0 } as const;

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

function createWaveScenario(campaignWaves: readonly CampaignWaveDefinition[] = dakota06CampaignWaves): ScenarioContent {
  return {
    id: 'ice-rocks-wave-test',
    formalSettlementSupported: true,
    title: { en: 'Ice Rocks', zh: '冰岩' },
    map: createDakota06MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota06MapUnits(),
    dynamite: createDakota06DynamiteDefinition([]),
    maxUpgrades: dakota06MaxUpgrades,
    previewWave: dakota06PreviewWave,
    campaignWaveCount: dakota06CampaignWaves.length,
    campaignWaves,
    campaignUnitPool: dakota06CampaignUnitPool,
    campaignBonusCratePool: dakota06BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota06CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota06BaseEnemy,
    campaignEnemyByType: dakota06EnemyByType,
  };
}

test('Ice Rocks stores all nine APK waves, sixteen requests and the exact spawn-action mapping', () => {
  assert.deepEqual(dakota06SpawnPointIdByActionId, expectedSpawnPointByActionId);
  assert.equal(dakota06CampaignWaves.length, 9);
  assert.equal(dakota06CampaignSpawnRequestCount, 16);
  assert.deepEqual(dakota06CampaignWaves.map(waveShape), expectedWaves());
  assert.ok(dakota06CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota06CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)),
    'the Doc request slot remains empty in every wave');
  assert.deepEqual(dakota06CampaignWaves[8]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 9 places one Boss in request slot 8');
});

test('Ice Rocks Wave 1 short GameSession uses APK action 1 without assuming a fixed enemy order', async () => {
  const scenario = createWaveScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_636,
  });

  try {
    assert.equal(session.observe().wave?.pendingSpawnRequests, 20);
    let firstSpawn: { spawnPointId: number; requestType: number; waveNumber: number } | undefined;
    for (let frame = 0; frame < 220 && firstSpawn === undefined; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned' && event.waveNumber === 1) firstSpawn = event;
    }
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.waveNumber, 1);
    assert.equal(firstSpawn.spawnPointId, expectedSpawnPointByActionId[1]);
    assert.equal(firstSpawn.spawnPointId, 1, 'APK Wave 1 action 1 selects Ice Rocks row-major spawn point 1');
    assert.ok(firstSpawn.requestType >= 1 && firstSpawn.requestType <= 8,
      'the request vector selects among remaining ordinary types; it does not set a deterministic type order');
  } finally {
    session.close();
  }
});

test('Ice Rocks Wave 9 short GameSession creates its Boss and leaves the Doc slot empty', async () => {
  const bossProbeWaves = dakota06CampaignWaves.map((wave, index) => index === 8
    ? { ...wave, delayMs: 0 }
    : { ...wave, delayMs: 0, spawnPools: [] });
  const scenario = createWaveScenario(bossProbeWaves);
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_637,
  });

  try {
    let view = session.observe();
    for (let frame = 0; frame < 80 && !view.enemies.some(({ type }) => type === 7); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const boss = view.enemies.find(({ type }) => type === 7);
    assert.equal(view.wave?.number, 9);
    assert.equal(view.wave?.totalWaves, 9);
    assert.ok(boss);
    assert.equal(boss.asset, 'boss');
    assert.equal(view.enemies.filter(({ type }) => type === 8).length, 0);
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned'
      && event.waveNumber === 9
      && event.spawnPointId === expectedSpawnPointByActionId[0]
      && event.requestType === 7
      && event.groupSize === 1));
  } finally {
    session.close();
  }
});
