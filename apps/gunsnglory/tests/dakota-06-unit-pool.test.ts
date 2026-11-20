import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-06.json';
import { dakota06CampaignUnitPool } from '../src/content/dakota-06-unit-pool';
import { createDakota06MapUnits } from '../src/content/dakota-06-units';
import { applyCampaignUnitPoolActions, createCampaignUnitPoolRuntime } from '../src/game/campaign-unit-pool';

const expectedSpawnLocations = [
  { marker: 112, id: 'saloon', spawnLocationType: 1, x: 3, y: 3 },
  { marker: 113, id: 'fort', spawnLocationType: 2, x: 29, y: 8 },
  { marker: 114, id: 'tipi', spawnLocationType: 3, x: 21, y: 20 },
] as const;

test('Ice Rocks player pool maps all APK buildings, unit templates and Wave 1 actions', () => {
  for (const expected of expectedSpawnLocations) {
    const cells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
      code === expected.marker ? [[x, y]] : []
    )));
    assert.deepEqual(cells, [[expected.x, expected.y]], `raw${expected.marker} marker coordinate`);
  }

  assert.deepEqual(dakota06CampaignUnitPool.spawnLocations.map(({ id, spawnLocationType, cell }) => ({
    id, spawnLocationType, x: cell.x, y: cell.y,
  })), expectedSpawnLocations.map(({ id, spawnLocationType, x, y }) => ({ id, spawnLocationType, x, y })));
  assert.deepEqual(dakota06CampaignUnitPool.units.map(({ poolType, unitType, spawnLocationType, template }) => ({
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

  assert.deepEqual(dakota06CampaignUnitPool.actions, [
    {
      waveNumber: 1,
      action: 'set',
      values: [
        { poolType: 1, count: 0 }, { poolType: 2, count: 0 },
        { poolType: 3, count: 0 }, { poolType: 4, count: 0 },
      ],
    },
    {
      waveNumber: 1,
      action: 'set-max',
      values: [
        { poolType: 1, count: 3 }, { poolType: 2, count: 3 },
        { poolType: 3, count: 3 }, { poolType: 4, count: 3 },
      ],
    },
  ]);

  const runtime = createCampaignUnitPoolRuntime(dakota06CampaignUnitPool)!;
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0]);
  applyCampaignUnitPoolActions(runtime, dakota06CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'Wave 1 SET begins with empty inventory');
  assert.deepEqual(runtime.maximum.slice(1, 5), [3, 3, 3, 3], 'Wave 1 SET_MAX applies three to each configured pool');
  assert.equal(dakota06CampaignUnitPool.intervalMs, 15_000,
    'the global dispatch interval is an existing web default, not an APK-verified Ice Rocks value');

  const initialUnits = createDakota06MapUnits();
  const mapCannons = initialUnits.filter(({ type }) => type === 'cannon');
  assert.equal(mapCannons.length, 5, 'only the five raw98 sleeping Cannon markers are initial map objects');
  assert.ok(mapCannons.every(({ activity }) => activity === 4));
  assert.ok(dakota06CampaignUnitPool.units.every(({ template }) => template?.activity === 5),
    'the active spawn templates do not create additional starting map units');
});
