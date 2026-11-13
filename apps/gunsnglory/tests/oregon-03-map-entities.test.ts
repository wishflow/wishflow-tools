import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-03.json';
import { createOregon03MapContent } from '../src/content/oregon-03-map-entities';
import { oregon03CampaignUnitPool } from '../src/content/oregon-03-unit-pool';
import {
  advanceCampaignUnitPool,
  applyCampaignUnitPoolActions,
  createCampaignUnitPoolRuntime,
} from '../src/game/campaign-unit-pool';

function cellsForMarker(marker: number): { x: number; y: number }[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === marker ? [{ x, y }] : []
  )));
}

test('Chinook Woods resolves every map-decoration marker to the Oregon asset and anchor cell', () => {
  const scene = createOregon03MapContent(() => true).scene;
  const expectations = [
    [69, 'e_1x1_rocks_a'],
    [72, 'b_1x1_stake'],
    [74, 'b_1x1_windmill'],
    [79, 'e_1x1_tree_green_a'],
    [94, 'tiles_railway_buffers_verti_up'],
    [95, 'tiles_railway_buffers_verti_down'],
    [114, 'b_2x1_tipi'],
    [115, 'e_1x1_tree_green_b'],
    [117, 'b_1x1_tipi_small'],
    [118, 'e_1x1_tree_stump'],
    [119, 'e_1x1_tree_green_c'],
  ] as const;

  for (const [marker, asset] of expectations) {
    const decorations = scene.decorations?.filter(({ asset: actualAsset }) => actualAsset === asset) ?? [];
    assert.deepEqual(decorations.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} maps to ${asset}`);
  }
  assert.equal(scene.decorations?.length, 44);

  const stake = scene.decorations?.find(({ asset }) => asset === 'b_1x1_stake');
  assert.deepEqual(stake, {
    asset: 'b_1x1_stake',
    cell: { x: 3, y: 21 },
    collisionBoxFine: { x: 1920, y: 2612, width: 3840, height: 2534 },
  });
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'b_1x1_tipi_small')?.cell, { x: 1, y: 15 });
});

test('Chinook Woods map units and train match every TDM marker and four-bit unlock combination', () => {
  const markerGroups = [
    [96, 'gunslinger', 4],
    [97, 'mexican', 4],
    [99, 'indian', 4],
    [100, 'sniper', 4],
    [101, 'grandpa', 4],
    [105, 'mexican', 5],
    [130, 'pyromaniac', 4],
    [131, 'salesman', 4],
  ] as const;
  const allUnlocked = createOregon03MapContent(() => true);
  const mapUnits = allUnlocked.units.filter(({ movementGroupId }) => !movementGroupId);

  for (const [marker, type, activity] of markerGroups) {
    const actual = mapUnits.filter((unit) => unit.type === type && unit.activity === activity);
    assert.deepEqual(actual.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} creates ${type}`);
  }
  assert.equal(allUnlocked.units.length, 41);
  assert.equal(new Set(allUnlocked.units.map(({ id }) => id)).size, allUnlocked.units.length);
  assert.equal(allUnlocked.units.some(({ type }) => type === 'cannon' || type === 'gambler'), false);
  assert.equal(allUnlocked.units.some(({ type, activity }) => type === 'indian' && activity === 5), false);

  const expectedTrain = [
    { type: 'train-22', activity: 4, asset: 'lok_wagon_verti', cell: { x: 15, y: 3 } },
    { type: 'train-22', activity: 4, asset: 'lok_wagon_verti', cell: { x: 15, y: 4 } },
    { type: 'train-22', activity: 5, asset: 'lok_wagon_verti', cell: { x: 15, y: 5 } },
    { type: 'train-20', activity: 5, asset: 'lok_verti_2of2', cell: { x: 15, y: 6 } },
    { type: 'train-21', activity: 5, asset: 'lok_verti_1of2', cell: { x: 15, y: 7 } },
  ];
  const train = allUnlocked.units.filter(({ movementGroupId }) => movementGroupId === 'oregon-03-train');
  assert.deepEqual(train.map(({ type, activity, asset, cell }) => ({ type, activity, asset, cell })), expectedTrain);
  assert.ok(train.every(({ movementAxis }) => movementAxis === 'vertical'));
  assert.equal(new Set(train.map(({ movementGroupId }) => movementGroupId)).size, 1);

  const gatedMarkers = [
    [100, 'sniper', 5],
    [101, 'grandpa', 6],
    [130, 'pyromaniac', 35],
    [131, 'salesman', 36],
  ] as const;
  for (let mask = 0; mask < 16; mask += 1) {
    const current = createOregon03MapContent((unitTypeId) => {
      const gateIndex = gatedMarkers.findIndex(([, , gatedTypeId]) => gatedTypeId === unitTypeId);
      return gateIndex < 0 || ((mask & (1 << gateIndex)) !== 0);
    });
    for (const [marker, type, unitTypeId] of gatedMarkers) {
      const gateIndex = gatedMarkers.findIndex(([, , gatedTypeId]) => gatedTypeId === unitTypeId);
      const expectedCells = (mask & (1 << gateIndex)) !== 0 ? cellsForMarker(marker) : [];
      assert.deepEqual(
        current.units.filter((unit) => unit.type === type && unit.activity === 4).map(({ cell }) => cell),
        expectedCells,
        `mask ${mask} applies unlock state to ${type}`,
      );
    }
  }
});

test('Chinook Woods Indian pool uses the existing Tipi template contract and wave-one reset/cap', () => {
  assert.deepEqual(oregon03CampaignUnitPool.spawnLocations, [
    { id: 'tipi-1-18', spawnLocationType: 3, cell: { x: 1, y: 18 } },
  ]);
  assert.equal(oregon03CampaignUnitPool.units.length, 1);
  assert.equal(oregon03CampaignUnitPool.units[0]?.poolType, 4);
  assert.equal(oregon03CampaignUnitPool.units[0]?.unitType, 'indian');
  assert.equal(oregon03CampaignUnitPool.units[0]?.spawnLocationType, 3);
  assert.equal(oregon03CampaignUnitPool.units[0]?.template?.type, 'indian');

  const runtime = createCampaignUnitPoolRuntime(oregon03CampaignUnitPool)!;
  assert.equal(runtime.pending[4], 0, 'pool starts with no Indian in stock');
  assert.equal(runtime.maximum[4], 0, 'pool starts with no lifetime allowance before wave one');
  runtime.pending[1] = 2;
  runtime.pending[2] = 3;
  runtime.pending[3] = 4;
  runtime.maximum[1] = 6;
  runtime.maximum[2] = 7;
  runtime.maximum[3] = 8;
  applyCampaignUnitPoolActions(runtime, oregon03CampaignUnitPool, 1);
  assert.deepEqual(runtime.pending.slice(1, 5), [0, 0, 0, 0], 'wave-one SET clears every pool slot');
  assert.deepEqual(runtime.maximum.slice(1, 5), [0, 0, 0, 5], 'wave-one SET_MAX opens only five Indian spawns');

  runtime.pending[4] = 1;
  runtime.remainingMs = -1;
  const random = { nextInt: (bound: number) => bound === 37 ? 4 : 0 };
  assert.deepEqual(advanceCampaignUnitPool(runtime, oregon03CampaignUnitPool, 0, random, () => false), []);
  assert.equal(runtime.locations[0]?.spawning, true);
  const spawned = advanceCampaignUnitPool(runtime, oregon03CampaignUnitPool, 1_001, random, () => false);
  assert.deepEqual(spawned, [{
    poolType: 4,
    unitType: 'indian',
    id: 'indian-spawn-01',
    cell: { x: 1, y: 18 },
    positionFine: { x: 11_520, y: 144_000 },
  }]);
});
