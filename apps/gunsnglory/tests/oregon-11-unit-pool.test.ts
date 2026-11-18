import assert from 'node:assert/strict';
import test from 'node:test';
import { createOregon10CampaignContent } from '../src/content/oregon-10-campaign';
import { createSleepingMapUnitsFromGrid } from '../src/content/cow-gulch';
import { oregon11CampaignUnitPool } from '../src/content/oregon-11-unit-pool';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

const expectedWaveOneMaxima = [2, 2, 0, 0];

function createLootLakesPoolFixture(): ScenarioContent {
  const base = createOregon10CampaignContent();
  const tileGrid = Array.from({ length: 24 }, () => Array<number>(32).fill(0));
  for (const [x, y] of [[2, 2], [5, 2], [8, 2]] as const) tileGrid[y]![x] = 96;
  for (const [x, y] of [[2, 5], [5, 5], [8, 5]] as const) tileGrid[y]![x] = 97;
  const units = createSleepingMapUnitsFromGrid(tileGrid);
  const emptyGrid = Array.from({ length: 24 }, () => Array<number>(32).fill(0));
  const wave: CampaignWaveDefinition = {
    number: 1,
    delayMs: 1_000_000,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: [{
      spawnPointId: 0,
      intervalMs: 1_000_000,
      requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }],
  };

  return {
    ...base,
    id: 'loot-lakes-unit-pool-test',
    formalSettlementSupported: true,
    map: {
      ...base.map,
      decorations: [],
      backgroundCollisionCodes: emptyGrid,
      originalTileGrid: emptyGrid,
    },
    originalTileGrid: emptyGrid,
    units,
    previewWave: { ...base.previewWave!, initialCash: 10_000 },
    campaignWaveCount: 1,
    campaignWaves: [wave],
    campaignUnitPool: oregon11CampaignUnitPool,
  };
}

test('Loot Lakes Wave 1 clears stock and sets the four player-pool caps to 2,2,0,0', () => {
  const runtime = createCampaignUnitPoolRuntime(oregon11CampaignUnitPool);
  assert.ok(runtime);
  runtime.pending[1] = 4;
  runtime.pending[2] = 4;
  runtime.pending[3] = 1;
  runtime.pending[4] = 1;

  applyCampaignUnitPoolActions(runtime, oregon11CampaignUnitPool, 1);

  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  assert.deepEqual(runtime.maximum.slice(1, 5), expectedWaveOneMaxima);
  assert.deepEqual(oregon11CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType }) => [
    poolType, unitType, spawnLocationType,
  ]), [[1, 'gunslinger', 1], [2, 'mexican', 1]]);
  assert.deepEqual(oregon11CampaignUnitPool.spawnLocations, [
    { id: 'saloon-9-15', spawnLocationType: 1, cell: { x: 9, y: 15 } },
  ]);
});

test('Loot Lakes short GameSession dispatches at most two Gunslingers and Mexicans from the Saloon', async () => {
  const scenario = createLootLakesPoolFixture();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 31_031,
  });

  try {
    const hireableUnits = session.observe().units.filter(({ activity }) => activity === 4);
    assert.equal(hireableUnits.length, 6);
    for (const unit of hireableUnits) {
      assert.equal(session.submitIntent({
        type: 'select-at', x: unit.cell.x + 0.5, y: unit.cell.y + 0.5,
      }), true);
      let view = session.advance({ deltaMs: 100 });
      assert.equal(view.units.find(({ id }) => id === unit.id)?.selected, true);
      assert.equal(session.submitIntent({
        type: 'hire-map-unit', unitId: unit.id, commandId: `hire-${unit.id}`,
      }), true);
      view = session.advance({ deltaMs: 100 });
      assert.ok(view.events.some((event) => event.type === 'map-unit-hired' && event.unitId === unit.id));
    }

    const processedSpawnIds = new Set<string>();
    let movedSpawnCount = 0;
    let view = session.observe();
    for (let frame = 0; frame < 1_150; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      const spawned = view.units.find(({ id, activity }) => activity === 2 && !processedSpawnIds.has(id));
      if (!spawned) continue;
      processedSpawnIds.add(spawned.id);
      assert.deepEqual(spawned.cell, { x: 9, y: 15 }, 'the only dispatch point is the TDM Saloon');
      assert.equal(session.submitIntent({
        type: 'select-at', x: spawned.cell.x + 0.5, y: spawned.cell.y + 0.5,
      }), true);
      view = session.advance({ deltaMs: 100 });
      assert.equal(view.units.find(({ id }) => id === spawned.id)?.selected, true);
      const destination = [
        { x: 8, y: 20 }, { x: 10, y: 20 }, { x: 8, y: 22 }, { x: 10, y: 22 },
      ][movedSpawnCount++];
      assert.ok(destination);
      assert.equal(session.submitIntent({ type: 'move-unit', targetX: destination.x, targetY: destination.y }), true);
      session.advance({ deltaMs: 100 });
    }

    const poolSpawns = view.units.filter(({ activity }) => activity === 2);
    assert.equal(movedSpawnCount, 4, 'two entries from each non-zero pool can be dispatched');
    assert.deepEqual(poolSpawns.reduce<Record<string, number>>((counts, unit) => {
      counts[unit.type] = (counts[unit.type] ?? 0) + 1;
      return counts;
    }, {}), { gunslinger: 2, mexican: 2 });
    assert.equal(view.wave?.phase, 'active', 'the held enemy request keeps the short campaign session open');
  } finally {
    session.close();
  }
});
