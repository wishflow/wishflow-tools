import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-03.json';
import { dakota03RouteDefinitions } from '../src/content/dakota-03-routes';
import { createDakota03MapScene } from '../src/content/dakota-03-scene';
import { createDakota03MapUnits } from '../src/content/dakota-03-units';
import { dakota03CampaignUnitPool } from '../src/content/dakota-03-unit-pool';
import { mississippiBaseEnemy, mississippiEnemyByType } from '../src/content/mississippi-enemy-designs';
import {
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
} from '../src/game/campaign-unit-pool';
import { createGame, type CampaignWaveDefinition, type PreviewWaveDefinition, type ScenarioContent } from '../src/game';

const expectedFortCells = [{ x: 20, y: 3 }, { x: 8, y: 8 }] as const;
const firstRoute = dakota03RouteDefinitions[0]!;
const routeSpawns = [...new Map(dakota03RouteDefinitions.map(({ spawn }) => [
  `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
])).values()];
const uniqueExits = [...new Map(dakota03RouteDefinitions.map(({ exit }) => [
  `${exit.x},${exit.y}`, exit,
])).values()];

const previewWave: PreviewWaveDefinition = {
  number: 1,
  initialLives: 25,
  initialCash: 300,
  enemyHitPointMultiplierPercentByDifficulty: { easy: 100, medium: 100, hard: 100 },
  enemy: mississippiBaseEnemy,
  spawn: routeSpawns[0]!,
  additionalSpawns: routeSpawns.slice(1),
  routes: dakota03RouteDefinitions,
  baseEnemySpeed: 500,
  speedMultiplierMin: 90,
  speedMultiplierCount: 20,
  escapePenalty: 1,
  redirects: firstRoute.redirects,
  exit: firstRoute.exit,
  additionalExits: uniqueExits.slice(1),
};

const campaignWave: CampaignWaveDefinition = {
  number: 1,
  delayMs: 120_000,
  hitPointMultiplierPercent: 100,
  speedMultiplierPercent: 100,
  spawnPools: [{
    spawnPointId: 0,
    intervalMs: 60_000,
    requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  }],
};

function createPoolScenario(): ScenarioContent {
  return {
    id: 'dakota-03-unit-pool-probe',
    formalSettlementSupported: true,
    title: { en: 'Fort Knockout pool probe', zh: '堡垒击破单位池探针' },
    map: createDakota03MapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createDakota03MapUnits(),
    previewWave,
    campaignWaveCount: 1,
    campaignWaves: [campaignWave],
    campaignUnitPool: dakota03CampaignUnitPool,
    campaignEnemy: mississippiBaseEnemy,
    campaignEnemyByType: mississippiEnemyByType,
  };
}

test('Fort Knockout Cannon pool uses two real Forts, one pool-only template, and the APK Wave 1 cap', () => {
  const mapForts = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 113 ? [{ x, y }] : []
  )));
  assert.deepEqual(mapForts, expectedFortCells);
  assert.deepEqual(dakota03CampaignUnitPool.spawnLocations.map(({ cell }) => cell), expectedFortCells);

  assert.equal(dakota03CampaignUnitPool.units.length, 1);
  const [cannonPool] = dakota03CampaignUnitPool.units;
  assert.ok(cannonPool);
  assert.deepEqual(
    { poolType: cannonPool.poolType, unitType: cannonPool.unitType, spawnLocationType: cannonPool.spawnLocationType },
    { poolType: 3, unitType: 'cannon', spawnLocationType: 2 },
  );
  assert.equal(cannonPool.template?.type, 'cannon');
  assert.equal(cannonPool.template?.activity, 5);
  assert.equal(cannonPool.template?.asset, 'player_cannon');

  const initialCannons = createDakota03MapUnits().filter(({ type }) => type === 'cannon');
  assert.equal(initialCannons.length, 6, 'only six raw98 map markers create starting Cannons');
  assert.ok(initialCannons.every(({ activity }) => activity === 4));
  assert.ok(initialCannons.every(({ cell }) => !expectedFortCells.some((fort) => (
    fort.x === cell.x && fort.y === cell.y
  ))), 'the pool template does not add a Cannon at either Fort during setup');

  const runtime = createCampaignUnitPoolRuntime(dakota03CampaignUnitPool)!;
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 0, 0]);
  applyCampaignUnitPoolActions(runtime, dakota03CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'Wave 1 SET clears the player inventory');
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 5, 0], 'Wave 1 SET_MAX gives Cannon a cap of five');
});

test('a hired Fort Knockout Cannon enters the Cannon pool and spawns at an actual Fort', async () => {
  const scenario = createPoolScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 3303,
  });

  try {
    let view = session.observe();
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.cash, 300);
    const initialCannons = view.units.filter(({ type }) => type === 'cannon');
    assert.equal(initialCannons.length, 6, 'the independent pool template is not a seventh starting unit');

    const hire = initialCannons.find(({ activity }) => activity === 4);
    assert.ok(hire);
    assert.equal(session.submitIntent({
      type: 'select-at',
      x: hire.cell.x + 0.5,
      y: hire.cell.y + 0.5,
    }), true);
    view = session.advance({ deltaMs: 100 });
    assert.equal(view.units.find(({ id }) => id === hire.id)?.selected, true);
    assert.equal(session.submitIntent({ type: 'hire-map-unit', unitId: hire.id, commandId: 'dakota03-cannon-hire' }), true);
    view = session.advance({ deltaMs: 100 });
    assert.ok(view.events.some((event) => event.type === 'map-unit-hired' && event.unitId === hire.id));
    assert.equal(view.wave?.cash, 150);

    for (let frame = 0; frame < 220 && !view.units.some(({ id }) => id === 'cannon-spawn-01'); frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const spawned = view.units.find(({ id }) => id === 'cannon-spawn-01');
    assert.ok(spawned, 'the hired Cannon is dispatched through the campaign unit pool');
    assert.equal(spawned.type, 'cannon');
    assert.equal(spawned.activity, 2);
    assert.equal(spawned.asset, 'player_cannon');
    assert.ok(expectedFortCells.some(({ x, y }) => spawned.cell.x === x && spawned.cell.y === y));
    assert.equal(view.units.filter(({ type }) => type === 'cannon').length, 7);
    assert.equal(view.wave?.pendingSpawnRequests, 1, 'the delayed enemy request keeps the short probe in Wave 1');
  } finally {
    session.close();
  }
});
