import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-09.json';
import { dakota09CampaignUnitPool } from '../src/content/dakota-09-unit-pool';
import { createDakota09MapUnits } from '../src/content/dakota-09-units';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';

const expectedLocations = [
  { marker: 112, id: 'saloon-19-10', type: 1, x: 19, y: 10 },
  { marker: 112, id: 'saloon-15-15', type: 1, x: 15, y: 15 },
  { marker: 113, id: 'fort-30-6', type: 2, x: 30, y: 6 },
  { marker: 114, id: 'tipi-26-19', type: 3, x: 26, y: 19 },
] as const;

test('Snow Town pool templates and buildings map all four APK slots without adding starting units', () => {
  for (const expected of expectedLocations) {
    const cells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
      code === expected.marker ? [[x, y]] : []
    )));
    assert.ok(cells.some(([x, y]) => x === expected.x && y === expected.y), `raw ${expected.marker} source cell`);
  }

  assert.deepEqual(dakota09CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => ({
    id, spawnLocationType, x: cell.x, y: cell.y,
  })), [...expectedLocations]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map(({ id, type, x, y }) => ({ id, spawnLocationType: type, x, y })));
  assert.deepEqual(dakota09CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => ({
    poolType, unitType, spawnLocationType, templateType: template?.type, templateActivity: template?.activity,
  })), [
    { poolType: 1, unitType: 'gunslinger', spawnLocationType: 1, templateType: 'gunslinger', templateActivity: 5 },
    { poolType: 2, unitType: 'mexican', spawnLocationType: 1, templateType: 'mexican', templateActivity: 5 },
    { poolType: 3, unitType: 'cannon', spawnLocationType: 2, templateType: 'cannon', templateActivity: 5 },
    { poolType: 4, unitType: 'indian', spawnLocationType: 3, templateType: 'indian', templateActivity: 5 },
  ]);

  const initialUnits = createDakota09MapUnits();
  assert.equal(initialUnits.filter(({ type }) => type === 'gunslinger').length, 9);
  assert.equal(initialUnits.filter(({ type }) => type === 'mexican').length, 11);
  assert.equal(initialUnits.filter(({ type }) => type === 'cannon').length, 6);
  assert.equal(initialUnits.filter(({ type }) => type === 'indian').length, 9);
  assert.ok(initialUnits.every(({ activity }) => activity === 4 || activity === 5), 'only TDM hires and train activity states exist');

  const runtime = createCampaignUnitPoolRuntime(dakota09CampaignUnitPool)!;
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  applyCampaignUnitPoolActions(runtime, dakota09CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'Wave 1 SET clears all four pending slots');
  assert.deepEqual(runtime.maximum.slice(1, 5), [4, 4, 4, 4], 'Wave 1 SET_MAX caps all four pool types at four');
  assert.equal(dakota09CampaignUnitPool.intervalMs, 15_000,
    'the pool uses the shared dispatch cadence, not a Snow Town wave parameter');
  assert.equal(initialUnits.filter(({ movementGroupId }) => movementGroupId === undefined).length, 35,
    'pool templates do not become extra initial units');
});
