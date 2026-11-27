import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/nevada-02.json';
import { createBombingtonMapScene } from '../src/content/bombington-scene';
import { createBombingtonMapUnits } from '../src/content/bombington-units';
import {
  bombingtonBaseEnemy,
  bombingtonBonusCratePool,
  bombingtonCampaignAwesomeEnemyTypeThreshold,
  bombingtonEnemyByType,
  bombingtonMaxUpgrades,
  bombingtonPreviewWave,
} from '../src/content/bombington-campaign-rules';
import {
  bombingtonCampaignSpawnRequestCount,
  bombingtonCampaignWaves,
} from '../src/content/bombington-campaign-waves';
import { bombingtonSpawnPointIdByActionId } from '../src/content/bombington-routes';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

interface ExpectedPool {
  actionId: number;
  intervalMs: number;
  requests: readonly number[];
}

interface ExpectedWave {
  delayMs: number;
  hitPointMultiplierPercent: number;
  speedMultiplierPercent: number;
  pools: readonly ExpectedPool[];
}

const expectedActionToPoint = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 } as const;

const expectedWaveRows: readonly ExpectedWave[] = [
  {
    delayMs: 25_000, hitPointMultiplierPercent: 115, speedMultiplierPercent: 115,
    pools: [{ actionId: 2, intervalMs: 2_500, requests: [2, 3, 4, 5, 3, 2, 0, 0, 0, 0] }],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 120, speedMultiplierPercent: 115,
    pools: [
      { actionId: 1, intervalMs: 2_500, requests: [0, 3, 4, 5, 2, 3, 0, 0, 0, 0] },
      { actionId: 2, intervalMs: 2_500, requests: [1, 3, 4, 5, 3, 1, 1, 0, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 125, speedMultiplierPercent: 125,
    pools: [
      { actionId: 0, intervalMs: 2_500, requests: [0, 3, 4, 5, 3, 1, 1, 0, 0, 0] },
      { actionId: 1, intervalMs: 2_500, requests: [0, 3, 5, 5, 2, 3, 0, 0, 0, 0] },
      { actionId: 2, intervalMs: 2_500, requests: [0, 3, 4, 4, 4, 3, 0, 0, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 135, speedMultiplierPercent: 130,
    pools: [
      { actionId: 0, intervalMs: 2_500, requests: [0, 2, 5, 5, 3, 1, 1, 1, 0, 0] },
      { actionId: 1, intervalMs: 2_500, requests: [0, 2, 4, 5, 2, 2, 0, 0, 0, 0] },
      { actionId: 2, intervalMs: 2_500, requests: [0, 2, 3, 3, 3, 2, 0, 0, 0, 0] },
      { actionId: 3, intervalMs: 2_500, requests: [0, 1, 2, 3, 3, 0, 0, 1, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 150, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 2_300, requests: [1, 3, 4, 5, 3, 1, 1, 0, 0, 0] },
      { actionId: 1, intervalMs: 2_300, requests: [0, 3, 5, 5, 2, 3, 0, 1, 0, 0] },
      { actionId: 2, intervalMs: 2_300, requests: [0, 3, 4, 5, 3, 3, 1, 1, 0, 0] },
      { actionId: 3, intervalMs: 2_300, requests: [0, 1, 2, 3, 3, 0, 0, 1, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 170, speedMultiplierPercent: 145,
    pools: [
      { actionId: 0, intervalMs: 2_300, requests: [1, 3, 4, 5, 3, 1, 1, 0, 0, 0] },
      { actionId: 1, intervalMs: 2_300, requests: [0, 3, 5, 5, 2, 3, 1, 1, 0, 0] },
      { actionId: 2, intervalMs: 2_300, requests: [0, 3, 4, 5, 3, 3, 2, 1, 0, 0] },
      { actionId: 3, intervalMs: 2_300, requests: [0, 1, 2, 3, 3, 1, 1, 1, 0, 0] },
      { actionId: 4, intervalMs: 2_300, requests: [0, 1, 2, 3, 3, 1, 0, 0, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 190, speedMultiplierPercent: 140,
    pools: [
      { actionId: 0, intervalMs: 2_500, requests: [0, 2, 3, 5, 3, 1, 2, 1, 0, 0] },
      { actionId: 1, intervalMs: 2_500, requests: [0, 2, 4, 5, 2, 3, 2, 1, 0, 0] },
      { actionId: 2, intervalMs: 2_500, requests: [0, 2, 3, 4, 3, 3, 2, 1, 0, 0] },
      { actionId: 3, intervalMs: 2_500, requests: [0, 0, 1, 2, 3, 2, 1, 1, 0, 0] },
      { actionId: 4, intervalMs: 2_500, requests: [0, 0, 1, 2, 3, 2, 2, 0, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 210, speedMultiplierPercent: 150,
    pools: [
      { actionId: 0, intervalMs: 2_500, requests: [0, 0, 0, 3, 6, 1, 2, 2, 0, 0] },
      { actionId: 1, intervalMs: 2_500, requests: [0, 0, 0, 3, 6, 2, 3, 1, 0, 0] },
      { actionId: 2, intervalMs: 2_500, requests: [0, 0, 0, 3, 6, 2, 2, 2, 0, 0] },
      { actionId: 3, intervalMs: 2_500, requests: [0, 0, 0, 2, 3, 2, 2, 1, 0, 0] },
      { actionId: 4, intervalMs: 2_500, requests: [0, 0, 0, 2, 3, 2, 2, 2, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 245, speedMultiplierPercent: 155,
    pools: [
      { actionId: 0, intervalMs: 2_300, requests: [0, 0, 3, 4, 3, 1, 2, 1, 0, 0] },
      { actionId: 1, intervalMs: 2_300, requests: [0, 0, 3, 4, 2, 2, 2, 1, 0, 0] },
      { actionId: 2, intervalMs: 2_300, requests: [0, 0, 2, 4, 3, 2, 2, 1, 0, 0] },
      { actionId: 3, intervalMs: 2_300, requests: [0, 0, 0, 2, 3, 2, 1, 1, 0, 0] },
      { actionId: 4, intervalMs: 2_300, requests: [0, 0, 0, 2, 3, 2, 2, 0, 0, 0] },
    ],
  },
  {
    delayMs: 15_000, hitPointMultiplierPercent: 240, speedMultiplierPercent: 125,
    pools: [
      { actionId: 0, intervalMs: 2_500, requests: [0, 0, 0, 2, 0, 0, 1, 2, 0, 0] },
      { actionId: 1, intervalMs: 2_500, requests: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0] },
      { actionId: 2, intervalMs: 2_500, requests: [0, 0, 0, 0, 4, 0, 0, 0, 0, 0] },
      { actionId: 3, intervalMs: 2_500, requests: [0, 0, 0, 3, 0, 0, 0, 0, 0, 0] },
      { actionId: 4, intervalMs: 2_500, requests: [0, 0, 0, 1, 0, 0, 0, 0, 1, 0] },
    ],
  },
];

function waveShape(wave: CampaignWaveDefinition) {
  return {
    number: wave.number,
    delayMs: wave.delayMs,
    hitPointMultiplierPercent: wave.hitPointMultiplierPercent,
    speedMultiplierPercent: wave.speedMultiplierPercent,
    spawnPools: wave.spawnPools.map(({ spawnPointId, intervalMs, requests }) => [
      spawnPointId, intervalMs, requests,
    ] as const),
  };
}

function expectedWaves() {
  return expectedWaveRows.map(({ delayMs, hitPointMultiplierPercent, speedMultiplierPercent, pools }, index) => ({
    number: index + 1,
    delayMs,
    hitPointMultiplierPercent,
    speedMultiplierPercent,
    spawnPools: pools.map(({ actionId, intervalMs, requests }) => [
      expectedActionToPoint[actionId as keyof typeof expectedActionToPoint], intervalMs, [...requests],
    ] as const),
  }));
}

function createScenario(waves: readonly CampaignWaveDefinition[], id: string): ScenarioContent {
  return {
    id,
    formalSettlementSupported: true,
    title: { en: 'Bombington', zh: '炸弹镇' },
    map: createBombingtonMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createBombingtonMapUnits(),
    maxUpgrades: bombingtonMaxUpgrades,
    previewWave: bombingtonPreviewWave,
    campaignWaveCount: waves.length,
    campaignWaves: waves,
    campaignBonusCratePool: bombingtonBonusCratePool,
    campaignAwesomeEnemyTypeThreshold: bombingtonCampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: bombingtonBaseEnemy,
    campaignEnemyByType: bombingtonEnemyByType,
  };
}

test('Bombington preserves all ten APK waves and 39 action-specific request rows', () => {
  assert.deepEqual(bombingtonCampaignWaves.map(waveShape), expectedWaves());
  assert.deepEqual(bombingtonSpawnPointIdByActionId, expectedActionToPoint);
  assert.equal(bombingtonCampaignWaves.length, 10);
  assert.equal(bombingtonCampaignSpawnRequestCount, 39);
  assert.ok(bombingtonCampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests.length === 10)));
  assert.ok(bombingtonCampaignWaves.every(({ spawnPools }) => spawnPools.every(({ requests }) => requests[9] === 0)));
  assert.deepEqual(bombingtonCampaignWaves[9]?.spawnPools[4]?.requests,
    [0, 0, 0, 1, 0, 0, 0, 0, 1, 0], 'the last pool has one Boss request in slot 9 and no Doc request');
});

test('Bombington Wave 1 spawns from APK action 2 at the mapped physical entrance', async () => {
  const scenario = createScenario(bombingtonCampaignWaves, 'bombington-wave-one-test');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 4_210,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 10);
    assert.equal(view.wave?.pendingSpawnRequests, 19);
    assert.equal(view.wave?.cash, 300);
    assert.equal(view.wave?.lives, 25);

    let firstSpawn: Extract<(typeof view.events)[number], { type: 'enemy-group-spawned' }> | undefined;
    for (let frame = 0; frame < 270 && !firstSpawn; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      firstSpawn = view.events.find((event) => event.type === 'enemy-group-spawned');
    }
    assert.ok(firstSpawn, 'Wave 1 dispatches its first request after the original delay');
    assert.equal(firstSpawn.spawnPointId, bombingtonSpawnPointIdByActionId[2]);
    assert.ok([2, 3, 4, 5, 6].includes(firstSpawn.requestType), 'the runtime chooses from the non-empty Wave 1 slots');
  } finally {
    session.close();
  }
});

test('Bombington final-wave Boss slot dispatches through a short GameSession', async () => {
  const finalWave = bombingtonCampaignWaves[9]!;
  const sourceBossPool = finalWave.spawnPools[4]!;
  const bossWave: CampaignWaveDefinition = {
    ...finalWave,
    number: 1,
    delayMs: 0,
    spawnPools: [{
      ...sourceBossPool,
      intervalMs: 0,
      requests: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    }],
  };
  const scenario = createScenario([bossWave], 'bombington-boss-slot-test');
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 4_211,
  });

  try {
    let spawn: {
      type: 'enemy-group-spawned';
      spawnPointId: number;
      requestType: number;
      groupSize: number;
    } | undefined;
    for (let frame = 0; frame < 4 && !spawn; frame += 1) {
      const view = session.advance({ deltaMs: 100 });
      spawn = view.events.find((event) => event.type === 'enemy-group-spawned');
    }
    assert.ok(spawn);
    assert.deepEqual({
      spawnPointId: spawn.spawnPointId,
      requestType: spawn.requestType,
      groupSize: spawn.groupSize,
    }, {
      spawnPointId: bombingtonSpawnPointIdByActionId[4],
      requestType: 7,
      groupSize: 1,
    });
  } finally {
    session.close();
  }
});
