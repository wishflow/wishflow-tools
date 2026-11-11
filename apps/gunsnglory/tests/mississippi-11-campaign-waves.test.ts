import assert from 'node:assert/strict';
import test from 'node:test';
import { createMississippi11MapScene } from '../src/content/mississippi-11-scene';
import { createMississippi11SteamerUnits } from '../src/content/mississippi-11-steamer';
import { createMississippi11TrainUnits } from '../src/content/mississippi-11-trains';
import { createMississippi11MapUnits } from '../src/content/mississippi-11-units';
import map from '../src/content/mississippi-11.json';
import {
  mississippi11BaseEnemy,
  mississippi11BonusCratePool,
  mississippi11CampaignAwesomeEnemyTypeThreshold,
  mississippi11EnemyByType,
  mississippi11PreviewWave,
} from '../src/content/mississippi-11-campaign-rules';
import { mississippi11CampaignWaves } from '../src/content/mississippi-11-campaign-waves';
import type { CampaignWaveDefinition, ScenarioContent } from '../src/game';
import { createGame } from '../src/game';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 20_000, hitPointMultiplierPercent: 325, speedMultiplierPercent: 110, spawnPools: [[0, 2_000, [1, 1, 2, 2, 0, 0, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 8_000, hitPointMultiplierPercent: 330, speedMultiplierPercent: 105, spawnPools: [[0, 2_000, [1, 1, 2, 2, 2, 0, 0, 0, 0, 0]]] },
  { number: 3, delayMs: 8_000, hitPointMultiplierPercent: 280, speedMultiplierPercent: 100, spawnPools: [[0, 2_500, [0, 1, 1, 1, 2, 1, 0, 0, 0, 0]], [1, 2_500, [1, 2, 1, 2, 3, 1, 0, 0, 0, 0]]] },
  { number: 4, delayMs: 10_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 105, spawnPools: [[2, 3_000, [1, 0, 2, 2, 3, 2, 0, 0, 0, 0]], [3, 3_000, [1, 2, 2, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 5, delayMs: 6_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 100, spawnPools: [[0, 3_500, [0, 0, 1, 2, 2, 2, 1, 0, 0, 0]], [2, 3_500, [0, 0, 1, 2, 2, 2, 1, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 105, spawnPools: [[1, 3_500, [0, 0, 1, 1, 2, 3, 2, 0, 0, 0]], [3, 3_500, [0, 2, 1, 0, 2, 3, 2, 0, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 100, spawnPools: [[0, 4_000, [1, 1, 0, 0, 3, 3, 2, 0, 0, 0]], [1, 3_500, [1, 1, 0, 0, 3, 3, 1, 0, 0, 0]], [2, 3_500, [0, 2, 0, 0, 3, 3, 2, 0, 0, 0]], [3, 4_000, [0, 2, 0, 0, 3, 3, 1, 0, 0, 0]]] },
  { number: 8, delayMs: 5_000, hitPointMultiplierPercent: 235, speedMultiplierPercent: 110, spawnPools: [[0, 4_000, [1, 1, 0, 0, 3, 4, 3, 0, 0, 0]], [1, 3_500, [1, 1, 0, 0, 3, 3, 2, 0, 0, 0]], [2, 3_500, [0, 2, 0, 0, 3, 4, 3, 0, 0, 0]], [3, 4_000, [0, 2, 0, 0, 3, 3, 2, 0, 0, 0]]] },
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

function createCampaignScenario(): ScenarioContent {
  return {
    id: 'mississippi-11-wave-test',
    contentVersion: 'mississippi-11-wave-test-v1',
    formalSettlementSupported: true,
    title: { en: "Traveller's Town", zh: '旅行者小镇' },
    map: createMississippi11MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [
      ...createMississippi11MapUnits(),
      ...createMississippi11TrainUnits(),
      ...createMississippi11SteamerUnits(),
    ],
    maxUpgrades: 3,
    previewWave: mississippi11PreviewWave,
    campaignWaveCount: expectedWaves.length,
    campaignWaves: mississippi11CampaignWaves,
    campaignBonusCratePool: mississippi11BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: mississippi11CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: mississippi11BaseEnemy,
    campaignEnemyByType: mississippi11EnemyByType,
  };
}

test('Traveller’s Town eight waves match APK delays, difficulty modifiers, spawn pools, intervals, and full vectors', () => {
  assert.deepEqual(mississippi11CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi11CampaignWaves.length, 8);
  assert.equal(mississippi11CampaignWaves.reduce((count, { spawnPools }) => count + spawnPools.length, 0), 18);
  assert.ok(mississippi11CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
  assert.equal(mississippi11CampaignWaves[3]?.spawnPools[0]?.intervalMs, 3_000,
    'MAX_NUM_POINTS resolves to the 3-second interval in wave 4');
  assert.equal(mississippi11CampaignWaves[5]?.delayMs, 5_000,
    'UNIT_BONUS_DURATION_FIRE resolves to the 5-second delay in wave 6');
  assert.equal(mississippi11CampaignWaves[5]?.hitPointMultiplierPercent, 250,
    'DEFAULT_SWIPE_ANIMATION_DURATION resolves to 250 in the source argument used as HP percent');
});

test('real map14 formal content waits the full wave-one delay before its first pool-zero spawn', async () => {
  const scenario = createCampaignScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 711,
  });
  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.pendingSpawnRequests, 6);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 25);

    for (let frame = 0; frame < 200; frame += 1) view = session.advance({ deltaMs: 100 });
    assert.equal(view.elapsedMs, 20_000);
    assert.equal(view.enemies.length, 0, 'wave-one 20-second delay does not spawn early');

    view = session.advance({ deltaMs: 100 });
    assert.equal(view.elapsedMs, 20_100);
    assert.ok(view.enemies.length > 0, 'the first request spawns on the next simulation frame');
    assert.ok(view.events.some((event) => event.type === 'enemy-group-spawned' && event.waveNumber === 1 && event.spawnPointId === 0));
  } finally {
    session.close();
  }
});
