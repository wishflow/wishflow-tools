import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/oregon-02.json';
import { createOregon02MapContent } from '../src/content/oregon-02-map-entities';
import { createVerticalTrainPlacements } from '../src/content/campaign-map-unit-placements';

function cellsForMarker(marker: number): { x: number; y: number }[] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === marker ? [{ x, y }] : []
  )));
}

test('Cashcow Canyon resolves every static scenery marker to its Oregon decoration', () => {
  const scene = createOregon02MapContent(() => true).scene;
  const expectations = [
    [70, 'e_1x1_rocks_b'],
    [75, 'b_1x1_watertower'],
    [76, 'e_1x1_bush'],
    [79, 'e_1x1_tree_green_a'],
    [94, 'tiles_railway_buffers_verti_up'],
    [95, 'tiles_railway_buffers_verti_down'],
    [115, 'e_1x1_tree_green_b'],
    [116, 'b_2x1_shack'],
    [118, 'e_1x1_tree_stump'],
    [119, 'e_1x1_tree_green_c'],
  ] as const;

  for (const [marker, asset] of expectations) {
    const decorations = scene.decorations?.filter(({ asset: actualAsset }) => actualAsset === asset) ?? [];
    assert.deepEqual(decorations.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} maps to ${asset}`);
  }
  assert.equal(scene.decorations?.length, 49);

  const shack = scene.decorations?.find(({ asset }) => asset === 'b_2x1_shack');
  assert.deepEqual(shack?.cell, { x: 23, y: 11 });
  assert.equal(shack?.anchorOffsetX, -0.5);
  assert.deepEqual(shack?.fieldBlockBounds, { left: -1, right: 1, top: 0, bottom: 0 });
  assert.equal(scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);
});

test('Cashcow Canyon fresh hires match each APK marker and obey activity-4 unlocks', () => {
  const allUnlocked = createOregon02MapContent(() => true);
  const markerGroups = [
    [96, 'gunslinger', 4],
    [97, 'mexican', 4],
    [100, 'sniper', 4],
    [101, 'grandpa', 4],
    [104, 'gunslinger', 5],
    [105, 'mexican', 5],
    [130, 'pyromaniac', 4],
    [131, 'salesman', 4],
  ] as const;

  for (const [marker, type, activity] of markerGroups) {
    const actual = allUnlocked.units.filter((unit) => unit.type === type && unit.activity === activity && !unit.movementGroupId);
    assert.deepEqual(actual.map(({ cell }) => cell), cellsForMarker(marker), `TDM marker ${marker} creates ${type}`);
  }
  assert.equal(allUnlocked.units.filter(({ id }) => id.startsWith('gunslinger-hire-')).length, 16);
  assert.equal(allUnlocked.units.filter(({ id }) => id.startsWith('mexican-hire-')).length, 19);
  assert.equal(new Set(allUnlocked.units.map(({ id }) => id)).size, allUnlocked.units.length);
  assert.equal(allUnlocked.units.some(({ type }) => type === 'cannon' || type === 'gambler'), false);

  const locked = createOregon02MapContent(() => false);
  assert.equal(locked.units.some(({ activity, movementGroupId }) => activity === 4 && !movementGroupId), false);
  assert.deepEqual(
    locked.units.filter(({ activity, movementGroupId }) => activity === 5 && !movementGroupId)
      .map(({ type, cell }) => [type, cell]),
    [
      ['gunslinger', { x: 12, y: 7 }],
      ['mexican', { x: 14, y: 9 }],
      ['gunslinger', { x: 5, y: 17 }],
    ],
  );

  const onlyPyromaniacUnlocked = createOregon02MapContent((unitTypeId) => unitTypeId === 35);
  assert.deepEqual(onlyPyromaniacUnlocked.units.filter(({ type }) => type === 'pyromaniac').map(({ cell }) => cell), [{ x: 0, y: 16 }]);
  assert.equal(onlyPyromaniacUnlocked.units.some(({ type }) => type === 'salesman'), false);
  const onlySalesmanUnlocked = createOregon02MapContent((unitTypeId) => unitTypeId === 36);
  assert.deepEqual(onlySalesmanUnlocked.units.filter(({ type }) => type === 'salesman').map(({ cell }) => cell), [{ x: 18, y: 14 }]);
  assert.equal(onlySalesmanUnlocked.units.some(({ type }) => type === 'pyromaniac'), false);
});

test('Cashcow Canyon creates the three vertical train parts from markers 92 and 91', () => {
  const placements = createVerticalTrainPlacements(map.originalTileGrid);
  assert.deepEqual(placements.map(({ sourceCode, unitTypeId, activity, movementAxis, asset, cell }) => ({
    sourceCode, unitTypeId, activity, movementAxis, asset, cell,
  })), [
    {
      sourceCode: 92,
      unitTypeId: 22,
      activity: 4,
      movementAxis: 'vertical',
      asset: 'lok_wagon_verti',
      cell: { x: 13, y: 16 },
    },
    {
      sourceCode: 91,
      unitTypeId: 20,
      activity: 5,
      movementAxis: 'vertical',
      asset: 'lok_verti_2of2',
      cell: { x: 13, y: 17 },
    },
    {
      sourceCode: 91,
      unitTypeId: 21,
      activity: 5,
      movementAxis: 'vertical',
      asset: 'lok_verti_1of2',
      cell: { x: 13, y: 18 },
    },
  ]);

  const train = createOregon02MapContent(() => true).units.filter(({ movementGroupId }) => movementGroupId === 'oregon-02-train');
  assert.deepEqual(train.map(({ type, activity, movementAxis, asset, cell }) => ({
    type, activity, movementAxis, asset, cell,
  })), [
    { type: 'train-22', activity: 4, movementAxis: 'vertical', asset: 'lok_wagon_verti', cell: { x: 13, y: 16 } },
    { type: 'train-20', activity: 5, movementAxis: 'vertical', asset: 'lok_verti_2of2', cell: { x: 13, y: 17 } },
    { type: 'train-21', activity: 5, movementAxis: 'vertical', asset: 'lok_verti_1of2', cell: { x: 13, y: 18 } },
  ]);
  assert.equal(new Set(train.map(({ movementGroupId }) => movementGroupId)).size, 1);
});
