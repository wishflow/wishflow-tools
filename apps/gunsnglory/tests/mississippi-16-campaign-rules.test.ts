import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createDynamiteScenarioDefinition } from '../src/content/dynamite';
import { mississippiBaseEnemy, mississippiEnemyByType } from '../src/content/mississippi-enemy-designs';
import {
  mississippi16BonusCratePool,
  mississippi16MaxUpgrades,
  mississippi16PreviewWave,
} from '../src/content/mississippi-16-campaign-rules';
import { mississippi16CampaignWaves } from '../src/content/mississippi-16-campaign-waves';
import { mississippi16RouteDefinitions } from '../src/content/mississippi-16-routes';
import { createMississippi16MapScene } from '../src/content/mississippi-16-scene';
import { createMississippi16MapUnits } from '../src/content/mississippi-16-units';
import { mississippi16CampaignUnitPool } from '../src/content/mississippi-16-unit-pool';
import map from '../src/content/mississippi-16.json';

interface ExpectedWave {
  number: number;
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  spawnPools: readonly (readonly [spawnPointId: number, intervalMs: number, requests: readonly number[]])[];
}

const expectedWaves: readonly ExpectedWave[] = [
  { number: 1, delayMs: 15_000, hitPointMultiplierPercent: 180, speedMultiplierPercent: 100, spawnPools: [[0, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]], [1, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 2, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 100, spawnPools: [[2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 3, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 110, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 4, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 115, spawnPools: [[0, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]], [1, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [2, 2_000, [1, 1, 2, 2, 2, 3, 1, 0, 0, 0]], [3, 2_000, [1, 1, 1, 2, 3, 2, 0, 0, 0, 0]]] },
  { number: 5, delayMs: 6_000, hitPointMultiplierPercent: 300, speedMultiplierPercent: 110, spawnPools: [[4, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [5, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]]] },
  { number: 6, delayMs: 5_000, hitPointMultiplierPercent: 200, speedMultiplierPercent: 150, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [2, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [4, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [5, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]]] },
  { number: 7, delayMs: 5_000, hitPointMultiplierPercent: 225, speedMultiplierPercent: 110, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [4, 2_500, [0, 1, 1, 1, 2, 3, 1, 0, 0, 0]], [5, 2_500, [1, 2, 1, 2, 3, 3, 1, 0, 0, 0]]] },
  { number: 8, delayMs: 5_000, hitPointMultiplierPercent: 250, speedMultiplierPercent: 120, spawnPools: [[0, 3_500, [0, 0, 1, 1, 2, 3, 2, 1, 0, 0]], [1, 3_500, [1, 0, 1, 0, 2, 3, 2, 1, 0, 0]], [2, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [3, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [4, 4_000, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]], [5, 3_500, [1, 1, 0, 0, 3, 3, 2, 1, 0, 0]]] },
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

function createRuleFixture(): ScenarioContent {
  return {
    id: 'mississippi-16-rules-fixture',
    formalSettlementSupported: true,
    title: { en: 'Highpoint Terrace', zh: '高台露台' },
    map: createMississippi16MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createMississippi16MapUnits(),
    maxUpgrades: mississippi16MaxUpgrades,
    previewWave: mississippi16PreviewWave,
    campaignWaveCount: mississippi16CampaignWaves.length,
    campaignWaves: mississippi16CampaignWaves,
    campaignUnitPool: mississippi16CampaignUnitPool,
    campaignBonusCratePool: mississippi16BonusCratePool,
    campaignEnemy: mississippiBaseEnemy,
    campaignEnemyByType: mississippiEnemyByType,
  };
}

test('Highpoint Terrace matches APK start state and all eight wave request tables', () => {
  assert.equal(mississippi16MaxUpgrades, 3);
  assert.equal(mississippi16PreviewWave.initialCash, 365);
  assert.equal(mississippi16PreviewWave.initialLives, 20);
  assert.deepEqual(mississippi16PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 75, medium: 100, hard: 110,
  });
  assert.deepEqual(mississippi16BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 10, rewardTypeCount: 4,
  });
  assert.deepEqual(mississippi16CampaignWaves.map(waveShape), expectedWaves);
  assert.equal(mississippi16CampaignWaves.length, 8);
  assert.equal(mississippi16CampaignWaves.reduce((count, wave) => count + wave.spawnPools.length, 0), 30);
  assert.ok(mississippi16CampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => (
    requests.length === 10 && requests[8] === 0 && requests[9] === 0
  ))));
});

test('the first campaign wave opens with twenty requests and the Fort pool spawns a real Cannon', async () => {
  const scenario = createRuleFixture();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1601,
  });
  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
    assert.equal(view.wave?.pendingSpawnRequests, 20);
    assert.equal(view.wave?.cash, 365);
    assert.equal(view.wave?.lives, 20);
    assert.equal(scenario.campaignUnitPool?.intervalMs, 15_000);
    assert.deepEqual(scenario.campaignUnitPool?.actions, [
      { waveNumber: 1, action: 'set', values: [{ poolType: 3, count: 4 }] },
      { waveNumber: 1, action: 'set-max', values: [{ poolType: 3, count: 12 }] },
    ]);
    assert.deepEqual(scenario.campaignUnitPool?.spawnLocations.map(({ id, cell }) => [id, cell]), [
      ['fort-1', { x: 5, y: 5 }], ['fort-2', { x: 26, y: 5 }],
      ['fort-3', { x: 5, y: 16 }], ['fort-4', { x: 26, y: 16 }],
    ]);

    const forts = scenario.campaignUnitPool!.spawnLocations.map(({ cell }) => cell);
    assert.equal(view.units.filter(({ type }) => type === 'cannon').length, 1, 'only the APK code-106 map Cannon is placed initially');
    assert.ok(!view.units.some(({ type, cell }) => type === 'cannon' && forts.some((fort) => (
      fort.x === cell.x && fort.y === cell.y
    ))), 'the four Forts do not receive fake placed Cannon units');

    for (let frame = 0; frame < 220 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'the first-wave Fort pool dispatches a Cannon');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_cannon');
    assert.ok(forts.some(({ x, y }) => spawned.cell.x === x && spawned.cell.y === y));
  } finally {
    session.close();
  }
});

test('Highpoint Terrace dynamite markers use the existing level-20-or-30 progression rule', () => {
  const locked = createDynamiteScenarioDefinition(map.originalTileGrid, ['campaign-mississippi-15']);
  assert.deepEqual(locked, {
    unlocked: false,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 28, y: 10 }, boxCell: { x: 27, y: 11 } }],
  });
  assert.equal(createDynamiteScenarioDefinition(map.originalTileGrid, ['campaign-mississippi-10']).unlocked, true);
  assert.equal(createDynamiteScenarioDefinition(map.originalTileGrid, ['campaign-oregon-10']).unlocked, true);
});
