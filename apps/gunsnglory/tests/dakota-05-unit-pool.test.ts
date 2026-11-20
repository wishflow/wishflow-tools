import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-05.json';
import { dakota05BaseEnemy, dakota05EnemyByType, dakota05PreviewWave } from '../src/content/dakota-05-campaign-rules';
import { dakota05CampaignUnitPool } from '../src/content/dakota-05-unit-pool';
import { createDakota05MapScene } from '../src/content/dakota-05-scene';
import { createDakota05MapUnits } from '../src/content/dakota-05-units';
import { createDakota05SteamerUnits } from '../src/content/dakota-05-steamer';
import { createDakota05TrainUnits } from '../src/content/dakota-05-trains';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

const expectedLocations = [
  { marker: 113, id: 'fort', type: 2, x: 7, y: 15 },
  { marker: 112, id: 'saloon', type: 1, x: 24, y: 15 },
  { marker: 114, id: 'tipi', type: 3, x: 29, y: 21 },
] as const;

function createPoolScenario(): ScenarioContent {
  const wave: CampaignWaveDefinition = {
    number: 1,
    delayMs: 120_000,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    // Keep the short campaign probe alive without spawning during its observation window.
    spawnPools: [{ spawnPointId: 0, intervalMs: 120_000, requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
  };
  return {
    id: 'dakota-05-unit-pool-probe',
    formalSettlementSupported: true,
    title: { en: 'Ghost Town pool probe', zh: '幽灵镇单位池探针' },
    map: createDakota05MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [...createDakota05MapUnits(), ...createDakota05TrainUnits(), ...createDakota05SteamerUnits()],
    previewWave: dakota05PreviewWave,
    campaignWaveCount: 1,
    campaignWaves: [wave],
    campaignUnitPool: dakota05CampaignUnitPool,
    campaignEnemy: dakota05BaseEnemy,
    campaignEnemyByType: dakota05EnemyByType,
  };
}

test('Ghost Town pool maps APK unit slots to the three TDM buildings and Wave 1 limits', () => {
  for (const expected of expectedLocations) {
    const cells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
      code === expected.marker ? [[x, y]] : []
    )));
    assert.deepEqual(cells, [[expected.x, expected.y]], `raw${expected.marker} marker coordinate`);
  }

  assert.deepEqual(dakota05CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => ({
    id, spawnLocationType, x: cell.x, y: cell.y,
  })), expectedLocations.map(({ id, type, x, y }) => ({ id, spawnLocationType: type, x, y })));
  assert.deepEqual(dakota05CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => ({
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

  const initialUnits = createDakota05MapUnits();
  assert.equal(initialUnits.filter(({ type }) => type === 'cannon').length, 3);
  assert.ok(initialUnits.filter(({ type }) => type === 'cannon').every(({ activity }) => activity === 4),
    'the pool Cannon template does not add a fourth initial Cannon');
  assert.ok(initialUnits.filter(({ type }) => type === 'indian').every(({ activity }) => activity === 4),
    'the pool Indian template does not replace the sleeping map hires');

  const runtime = createCampaignUnitPoolRuntime(dakota05CampaignUnitPool)!;
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  applyCampaignUnitPoolActions(runtime, dakota05CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'Wave 1 SET starts with empty inventory');
  assert.deepEqual(runtime.maximum.slice(1, 5), [7, 7, 7, 7], 'Wave 1 SET_MAX sets seven for pool types 1–4');
  assert.equal(dakota05CampaignUnitPool.intervalMs, 15_000,
    'the interval is a shared web default, not an APK-verified Ghost Town value');
});

test('a hired Ghost Town map Cannon produces one separate active Cannon at the APK Fort', async () => {
  const scenario = createPoolScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3_605,
  });

  try {
    let view = session.observe();
    const mapCannons = view.units.filter(({ type }) => type === 'cannon');
    assert.equal(mapCannons.length, 3, 'only the three raw98 sleeping Cannon markers exist at setup');
    const hire = mapCannons.find(({ activity }) => activity === 4);
    assert.ok(hire);
    assert.equal(session.submitIntent({ type: 'select-at', x: hire.cell.x + 0.5, y: hire.cell.y + 0.5 }), true);
    view = session.advance({ deltaMs: 0 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'ghost-town-cannon-hire' }), true,
      `selected Cannon must be hireable: ${JSON.stringify(view.units.find(({ id }) => id === hire.id))}`);
    view = session.advance({ deltaMs: 0 });
    assert.ok(view.events.some((event) => event.type === 'map-unit-hired'
      && event.unitId === hire.id && event.unitType === 'cannon'));
    assert.equal(view.wave?.cash, 150);

    for (let frame = 0; frame < 220 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'hiring the Fort marker queues one pool Cannon');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_cannon');
    assert.deepEqual(spawned.cell, { x: 7, y: 15 });
    assert.equal(view.units.filter(({ type }) => type === 'cannon').length, 4,
      'the spawned replacement is separate from the hired map Cannon and two other sleepers');
  } finally {
    session.close();
  }
});
