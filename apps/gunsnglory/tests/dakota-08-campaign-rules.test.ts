import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-08.json';
import {
  dakota08BaseEnemy,
  dakota08BonusCratePool,
  dakota08CampaignAwesomeEnemyTypeThreshold,
  dakota08EnemyByType,
  dakota08LevelParameters,
  dakota08MaxUpgrades,
  dakota08PreviewWave,
  dakota08RawLevelParameters,
} from '../src/content/dakota-08-campaign-rules';
import { dakota08CampaignUnitPool } from '../src/content/dakota-08-unit-pool';
import { dakota08RouteDefinitions, dakota08SpawnPointIdByActionId } from '../src/content/dakota-08-routes';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import { createDakota08MapUnits } from '../src/content/dakota-08-units';
import { dakota08CampaignWaves } from '../src/content/dakota-08-campaign-waves';
import {
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
} from '../src/game/campaign-unit-pool';
import { createGame, type ScenarioContent } from '../src/game';

function createRulesScenario(): ScenarioContent {
  return {
    id: 'wayne-waters-rules-test',
    formalSettlementSupported: true,
    title: { en: 'Wayne Waters', zh: '韦恩水域' },
    map: createDakota08MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota08MapUnits(),
    maxUpgrades: dakota08MaxUpgrades,
    previewWave: dakota08PreviewWave,
    campaignWaveCount: dakota08CampaignWaves.length,
    campaignWaves: dakota08CampaignWaves,
    campaignUnitPool: dakota08CampaignUnitPool,
    campaignBonusCratePool: dakota08BonusCratePool,
    campaignAwesomeEnemyTypeThreshold: dakota08CampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: dakota08BaseEnemy,
    campaignEnemyByType: dakota08EnemyByType,
  };
}

test('Wayne Waters preserves parameter row 37 and only applies confirmed effects', () => {
  assert.deepEqual(dakota08RawLevelParameters,
    [250, 25, 999, 25_000, 3, 30_000, 5, 15, 56, 75, 100, 119_000]);
  assert.deepEqual(dakota08LevelParameters, {
    initialCash: 250,
    initialLives: 25,
    maxChests: 999,
    chestTimeMs: 25_000,
    maxUpgrades: 3,
    reservedParameter5: 30_000,
    awesomeMessageUnit: 5,
    maxChestsPlayfield: 15,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 100 },
    gamblerTimeMs: 119_000,
  });
  assert.equal(dakota08PreviewWave.enemy, dakota08BaseEnemy);
  assert.deepEqual(dakota08PreviewWave.enemyHitPointMultiplierPercentByDifficulty, {
    easy: 56, medium: 75, hard: 100,
  });
  assert.deepEqual(dakota08BonusCratePool, {
    totalCount: 999, intervalMs: 25_000, simultaneousLimit: 15, rewardTypeCount: 4,
  });
  assert.equal(dakota08CampaignAwesomeEnemyTypeThreshold, 5);
  assert.deepEqual(dakota08SpawnPointIdByActionId, { 0: 3, 1: 0, 2: 1, 3: 2 });
  assert.deepEqual(dakota08PreviewWave.routes, dakota08RouteDefinitions);
  assert.equal(dakota08PreviewWave.routes?.length, 6);
  assert.equal(dakota08CampaignWaves.length, 8);

  const scenario = createRulesScenario();
  assert.equal(scenario.gambler, undefined, 'a nonzero timer does not create a Gambler or Casino');
  assert.ok(!scenario.units.some(({ type }) => type === 'gambler'));
  assert.ok(!(scenario.map.decorations ?? []).some(({ asset }) => asset === 'b_3x2_casino'));
  assert.ok(!map.originalTileGrid.flat().includes(114), 'the TDM has no Tipi pool location');
  assert.deepEqual(dakota08CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => ({
    id, spawnLocationType, x: cell.x, y: cell.y,
  })), [
    { id: 'fort-2-12', spawnLocationType: 2, x: 2, y: 12 },
    { id: 'saloon-29-12', spawnLocationType: 1, x: 29, y: 12 },
  ]);
  assert.deepEqual(dakota08CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType }) => ({
    poolType, unitType, spawnLocationType,
  })), [
    { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1 },
    { poolType: 2, unitType: 'mexican', spawnLocationType: 1 },
    { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
  ]);

  const poolRuntime = createCampaignUnitPoolRuntime(dakota08CampaignUnitPool)!;
  applyCampaignUnitPoolActions(poolRuntime, dakota08CampaignUnitPool, 1);
  assert.deepEqual(poolRuntime.pending.slice(1, 5), [0, 0, 0, 0], 'Wave 1 SET clears all four raw slots');
  assert.deepEqual(poolRuntime.maximum.slice(1, 5), [3, 3, 3, 3], 'Wave 1 SET_MAX preserves all four raw slot caps');
  assert.ok(!dakota08CampaignUnitPool.units.some(({ poolType }) => poolType === 4),
    'slot 4 has no spawn template because the source map has no Tipi');
});

test('Wayne Waters GameSession starts with APK economy, lives, crate schedule and difficulty HP', async () => {
  const scenario = createRulesScenario();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty, randomSeed: 3_738 });
    try {
      const view = session.observe();
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 8);
      assert.equal(view.wave?.cash, 250);
      assert.equal(view.wave?.lives, 25);
      assert.equal(view.wave?.maxLives, 25);
      assert.deepEqual(scenario.previewWave?.enemyHitPointMultiplierPercentByDifficulty, {
        easy: 56, medium: 75, hard: 100,
      });
      assert.equal(view.bonusCratePool?.remainingCount, 999);
      assert.equal(view.bonusCratePool?.remainingMs, 25_000);
    } finally {
      session.close();
    }
  }
});

test('Wayne Waters hires from the real Saloon and dispatches one unit without a Tipi', async () => {
  const scenario = createRulesScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_839,
  });

  try {
    let view = session.observe();
    const hire = view.units.find(({ type, activity }) => type === 'gunslinger' && activity === 4);
    assert.ok(hire, 'Wayne Waters has TDM Gunslinger hire markers');
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    view = session.advance({ deltaMs: 0 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'wayne-waters-saloon-hire' }), true);
    view = session.advance({ deltaMs: 0 });
    assert.ok(view.events.some((event) => event.type === 'map-unit-hired' && event.unitId === hire.id));

    for (let frame = 0; frame < 220 && !view.units.some(({ id }) => id === 'gunslinger-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'gunslinger-spawn-01');
    assert.ok(spawned, 'the real Saloon receives the hired Gunslinger after the shared pool interval');
    assert.equal(spawned.activity, 2);
    assert.deepEqual(spawned.cell, { x: 29, y: 12 });
  } finally {
    session.close();
  }
});
