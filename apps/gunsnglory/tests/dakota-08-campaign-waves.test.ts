import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-08.json';
import { dakota08CampaignSpawnRequestCount, dakota08CampaignWaves } from '../src/content/dakota-08-campaign-waves';
import { dakota08SpawnPointIdByActionId } from '../src/content/dakota-08-routes';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import { createDakota08MapUnits } from '../src/content/dakota-08-units';
import {
  dakota08BaseEnemy,
  dakota08BonusCratePool,
  dakota08CampaignAwesomeEnemyTypeThreshold,
  dakota08EnemyByType,
  dakota08MaxUpgrades,
  dakota08PreviewWave,
} from '../src/content/dakota-08-campaign-rules';
import { dakota08CampaignUnitPool } from '../src/content/dakota-08-unit-pool';
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

// Independent expected data transcribed from the Wayne Waters static APK audit.
const expectedWaveRows: readonly ExpectedWave[] = [
  { delayMs: 15_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 120,
    pools: [{ actionId: 2, intervalMs: 2_000, counts: [2, 3, 4, 5, 5, 4, 0, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    pools: [{ actionId: 2, intervalMs: 2_000, counts: [1, 3, 4, 5, 4, 3, 2, 0] }] },
  { delayMs: 15_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 130,
    pools: [
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 3, 4, 4, 3, 2, 0] },
      { actionId: 3, intervalMs: 2_500, counts: [1, 3, 4, 4, 3, 3, 1, 0] },
    ] },
  { delayMs: 20_000, hitPointMultiplierPercent: 145, speedMultiplierPercent: 135,
    pools: [
      { actionId: 1, intervalMs: 2_500, counts: [1, 3, 4, 5, 4, 3, 2, 0] },
      { actionId: 2, intervalMs: 2_500, counts: [1, 3, 4, 4, 3, 3, 1, 0] },
    ] },
  { delayMs: 20_000, hitPointMultiplierPercent: 160, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 3, 4, 3, 3, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [1, 2, 3, 5, 4, 3, 2, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [1, 2, 4, 4, 3, 4, 1, 0] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 2, 3, 4, 4, 3, 2, 1] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 2, 3, 4, 3, 4, 1, 1] },
    ] },
  { delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, counts: [0, 1, 3, 3, 4, 4, 2, 1] },
      { actionId: 1, intervalMs: 2_500, counts: [0, 1, 3, 3, 4, 3, 2, 2] },
      { actionId: 2, intervalMs: 2_500, counts: [0, 1, 3, 3, 4, 4, 2, 2] },
      { actionId: 3, intervalMs: 2_500, counts: [0, 1, 3, 3, 4, 4, 2, 1] },
    ] },
  { delayMs: 25_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 155,
    pools: [{ actionId: 2, intervalMs: 50_000, counts: [0, 0, 0, 0, 0, 0, 0, 0], bossCount: 1 }] },
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
      [dakota08SpawnPointIdByActionId[actionId], intervalMs, [...counts, bossCount, docCount]] as const
    )),
  }));
}

function createRulesScenario(campaignWaves: readonly CampaignWaveDefinition[] = dakota08CampaignWaves): ScenarioContent {
  return {
    id: 'wayne-waters-waves-test',
    formalSettlementSupported: true,
    title: { en: 'Wayne Waters', zh: '韦恩水域' },
    map: createDakota08MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota08MapUnits(),
    maxUpgrades: dakota08MaxUpgrades,
    previewWave: dakota08PreviewWave,
    campaignWaveCount: campaignWaves.length,
    campaignWaves,
    campaignUnitPool: dakota08CampaignUnitPool,
    campaignBonusCratePool: dakota08BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota08CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota08BaseEnemy,
    campaignEnemyByType: dakota08EnemyByType,
  };
}

test('Wayne Waters stores all eight source waves and sixteen enemy request pools exactly', () => {
  assert.deepEqual(dakota08CampaignWaves.map(waveShape), expectedWaves());
  assert.equal(dakota08CampaignWaves.length, 8);
  assert.equal(dakota08CampaignSpawnRequestCount, 16);
  assert.ok(dakota08CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(dakota08CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)),
    'all waves leave the Doc request slot empty');
  assert.deepEqual(dakota08CampaignWaves[7]?.spawnPools[0]?.requests,
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 0], 'Wave 8 places its Boss in request index 8');
});

test('Wayne Waters Wave 1 consumes the APK action-2 route in a short GameSession', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_840,
  });

  try {
    assert.equal(session.observe().wave?.pendingSpawnRequests, 23);
    let firstSpawn: { spawnPointId: number; requestType: number; waveNumber: number } | undefined;
    let view = session.observe();
    for (let frame = 0; frame < 220 && firstSpawn === undefined; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const event = view.events.find((candidate) => candidate.type === 'enemy-group-spawned');
      if (event?.type === 'enemy-group-spawned' && event.waveNumber === 1) firstSpawn = event;
    }
    assert.ok(firstSpawn);
    assert.equal(firstSpawn.waveNumber, 1);
    assert.equal(firstSpawn.spawnPointId, dakota08SpawnPointIdByActionId[2]);
    assert.equal(firstSpawn.spawnPointId, 1, 'APK action 2 maps to Wayne Waters row-major spawn point 1');
    assert.ok([1, 2, 3, 4, 5, 6, 7, 8].includes(firstSpawn.requestType),
      'the random request vector selects a non-empty ordinary type without promising a fixed order');
  } finally {
    session.close();
  }
});
