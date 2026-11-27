import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/nevada-02.json';
import {
  bombingtonBaseEnemy,
  bombingtonBonusCratePool,
  bombingtonCampaignAwesomeEnemyTypeThreshold,
  bombingtonEnemyByType,
  bombingtonMaxUpgrades,
  bombingtonPreviewWave,
} from '../src/content/bombington-campaign-rules';
import { bombingtonCampaignWaves } from '../src/content/bombington-campaign-waves';
import { bombingtonCampaignUnitPool } from '../src/content/bombington-unit-pool';
import { createBombingtonMapScene } from '../src/content/bombington-scene';
import { createBombingtonMapUnits } from '../src/content/bombington-units';
import {
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
} from '../src/game/campaign-unit-pool';
import { createGame, type ScenarioContent } from '../src/game';

const expectedSpawnLocations = [
  { marker: 114, id: 'tipi-29-9', spawnLocationType: 3, x: 29, y: 9 },
  { marker: 113, id: 'fort-2-14', spawnLocationType: 2, x: 2, y: 14 },
  { marker: 112, id: 'saloon-29-21', spawnLocationType: 1, x: 29, y: 21 },
] as const;

function createScenario(): ScenarioContent {
  return {
    id: 'bombington-unit-pool-test',
    formalSettlementSupported: true,
    title: { en: 'Bombington', zh: '炸弹镇' },
    map: createBombingtonMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createBombingtonMapUnits(),
    maxUpgrades: bombingtonMaxUpgrades,
    previewWave: bombingtonPreviewWave,
    campaignWaveCount: bombingtonCampaignWaves.length,
    campaignWaves: bombingtonCampaignWaves,
    campaignUnitPool: bombingtonCampaignUnitPool,
    campaignBonusCratePool: bombingtonBonusCratePool,
    campaignAwesomeEnemyTypeThreshold: bombingtonCampaignAwesomeEnemyTypeThreshold,
    campaignEnemy: bombingtonBaseEnemy,
    campaignEnemyByType: bombingtonEnemyByType,
  };
}

test('Bombington unit pool uses the three TDM buildings and the four original unit slots', () => {
  assert.deepEqual(bombingtonCampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => ({
    id, spawnLocationType, x: cell.x, y: cell.y,
  })), expectedSpawnLocations.map(({ id, spawnLocationType, x, y }) => ({
    id, spawnLocationType, x, y,
  })));
  for (const { marker, x, y } of expectedSpawnLocations) {
    assert.equal(map.originalTileGrid[y]?.[x], marker, `raw marker ${marker} stays at (${x}, ${y})`);
  }

  assert.deepEqual(bombingtonCampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => ({
    poolType,
    unitType,
    spawnLocationType,
    templateType: template?.type,
    templateActivity: template?.activity,
  })), [
    { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1, templateType: 'gunslinger', templateActivity: 5 },
    { poolType: 2, unitType: 'mexican', spawnLocationType: 1, templateType: 'mexican', templateActivity: 5 },
    { poolType: 3, unitType: 'cannon', spawnLocationType: 2, templateType: 'cannon', templateActivity: 5 },
    { poolType: 4, unitType: 'indian', spawnLocationType: 3, templateType: 'indian', templateActivity: 5 },
  ]);
});

test('Bombington Wave 1 clears the four pending slots and sets their caps to four', () => {
  assert.deepEqual(bombingtonCampaignUnitPool.actions, [
    { waveNumber: 1, action: 'set', values: [
      { poolType: 1, count: 0 }, { poolType: 2, count: 0 },
      { poolType: 3, count: 0 }, { poolType: 4, count: 0 },
    ] },
    { waveNumber: 1, action: 'set-max', values: [
      { poolType: 1, count: 4 }, { poolType: 2, count: 4 },
      { poolType: 3, count: 4 }, { poolType: 4, count: 4 },
    ] },
  ]);

  const runtime = createCampaignUnitPoolRuntime(bombingtonCampaignUnitPool)!;
  runtime.pending.splice(1, 5, 2, 3, 1, 2);
  runtime.maximum.splice(1, 5, 8, 8, 8, 8);
  applyCampaignUnitPoolActions(runtime, bombingtonCampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [4, 4, 4, 4]);
  assert.equal(bombingtonCampaignUnitPool.intervalMs, 15_000,
    'uses the shared SpawnPoolManager cadence, not a level-specific wave parameter');

  const mapUnits = createBombingtonMapUnits();
  assert.deepEqual(['gunslinger', 'mexican', 'cannon', 'indian'].map((type) => mapUnits.filter((unit) => unit.type === type).length),
    [3, 4, 4, 4], 'pool templates do not duplicate the 15 TDM sleeping hire units');
  assert.equal(mapUnits.filter(({ activity }) => activity === 4).length, 15);
  assert.equal(mapUnits.length, 15, 'pool templates are not part of the starting map units');
});

test('Bombington map hire dispatches one Gunslinger from the real Saloon in a short session', async () => {
  const scenario = createScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 42_003,
  });

  try {
    let view = session.observe();
    const hire = view.units.find(({ type, activity }) => type === 'gunslinger' && activity === 4);
    assert.ok(hire);
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    view = session.advance({ deltaMs: 0 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'bombington-saloon-hire' }), true);
    view = session.advance({ deltaMs: 0 });
    assert.ok(view.events.some((event) => event.type === 'map-unit-hired' && event.unitId === hire.id));

    for (let frame = 0; frame < 190 && !view.units.some(({ id }) => id === 'gunslinger-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'gunslinger-spawn-01');
    assert.ok(spawned, 'the hired Gunslinger reaches the campaign pool and is generated');
    assert.equal(spawned.activity, 2);
    assert.deepEqual(spawned.cell, { x: 29, y: 21 });
  } finally {
    session.close();
  }
});
