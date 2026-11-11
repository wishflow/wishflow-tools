import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createHorizontalTrainPlacementGroups,
  createHorizontalTrainPlacements,
  createVerticalTrainPlacementGroups,
  createVerticalTrainPlacements,
} from '../src/content/campaign-map-unit-placements';

function createRailroadRanchTrainGrid(): number[][] {
  const grid = Array.from({ length: 24 }, () => Array<number>(32).fill(0));
  const horizontal = [
    { x: 17, y: 3, length: 4 },
    { x: 13, y: 10, length: 5 },
    { x: 16, y: 17, length: 4 },
  ];
  for (const { x, y, length } of horizontal) {
    grid[y]![x] = 83;
    grid[y]![x + 1] = 83;
    for (let index = 2; index < length; index += 1) grid[y]![x + index] = 84;
  }

  const vertical = [
    { x: 2, y: 11, wagons: [93, 93] },
    { x: 7, y: 14, wagons: [92, 92] },
    { x: 24, y: 13, wagons: [92, 92] },
  ];
  for (const { x, y, wagons } of vertical) {
    wagons.forEach((code, index) => { grid[y + index]![x] = code; });
    grid[y + wagons.length]![x] = 91;
    grid[y + wagons.length + 1]![x] = 91;
  }
  return grid;
}

function summarize(placements: ReturnType<typeof createHorizontalTrainPlacementGroups>[number]) {
  return placements.map(({ sourceCode, unitTypeId, activity, movementAxis, asset, cell }) => ({
    sourceCode, unitTypeId, activity, movementAxis, asset, cell,
  }));
}

test('decodes Railroad Ranch horizontal markers into three independent groups', () => {
  const groups = createHorizontalTrainPlacementGroups(createRailroadRanchTrainGrid());

  assert.deepEqual(groups.map((group) => group.length), [4, 5, 4]);
  assert.deepEqual(groups.map((group) => group[0]!.cell), [
    { x: 17, y: 3 },
    { x: 13, y: 10 },
    { x: 16, y: 17 },
  ]);
  assert.deepEqual(summarize(groups[0]!), [
    { sourceCode: 83, unitTypeId: 10, activity: 5, movementAxis: 'horizontal', asset: 'lok_hori_1of2', cell: { x: 17, y: 3 } },
    { sourceCode: 83, unitTypeId: 11, activity: 5, movementAxis: 'horizontal', asset: 'lok_hori_2of2', cell: { x: 18, y: 3 } },
    { sourceCode: 84, unitTypeId: 12, activity: 4, movementAxis: 'horizontal', asset: 'lok_wagon_hori', cell: { x: 19, y: 3 } },
    { sourceCode: 84, unitTypeId: 12, activity: 4, movementAxis: 'horizontal', asset: 'lok_wagon_hori', cell: { x: 20, y: 3 } },
  ]);
  assert.deepEqual(summarize(groups[1]!).map(({ cell }) => cell), [
    { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 15, y: 10 }, { x: 16, y: 10 }, { x: 17, y: 10 },
  ]);
  assert.deepEqual(summarize(groups[2]!).map(({ cell }) => cell), [
    { x: 16, y: 17 }, { x: 17, y: 17 }, { x: 18, y: 17 }, { x: 19, y: 17 },
  ]);
  assert.throws(() => createHorizontalTrainPlacements(createRailroadRanchTrainGrid()), /one horizontal train/i);
});

test('decodes Railroad Ranch vertical groups and preserves code 92/93 activity', () => {
  const groups = createVerticalTrainPlacementGroups(createRailroadRanchTrainGrid());

  assert.deepEqual(groups.map((group) => group.length), [4, 4, 4]);
  assert.deepEqual(groups.map((group) => group[0]!.cell), [
    { x: 2, y: 11 },
    { x: 24, y: 13 },
    { x: 7, y: 14 },
  ]);
  assert.deepEqual(summarize(groups[0]!), [
    { sourceCode: 93, unitTypeId: 22, activity: 5, movementAxis: 'vertical', asset: 'lok_wagon_verti', cell: { x: 2, y: 11 } },
    { sourceCode: 93, unitTypeId: 22, activity: 5, movementAxis: 'vertical', asset: 'lok_wagon_verti', cell: { x: 2, y: 12 } },
    { sourceCode: 91, unitTypeId: 20, activity: 5, movementAxis: 'vertical', asset: 'lok_verti_2of2', cell: { x: 2, y: 13 } },
    { sourceCode: 91, unitTypeId: 21, activity: 5, movementAxis: 'vertical', asset: 'lok_verti_1of2', cell: { x: 2, y: 14 } },
  ]);
  assert.ok(groups.slice(1).flat().filter(({ sourceCode }) => sourceCode === 92).every(({ activity }) => activity === 4));
  assert.throws(() => createVerticalTrainPlacements(createRailroadRanchTrainGrid()), /one vertical train/i);
});

test('rejects isolated or interrupted markers without merging neighboring trains', () => {
  const horizontalWagon = createRailroadRanchTrainGrid();
  horizontalWagon[0]![0] = 84;
  assert.throws(() => createHorizontalTrainPlacementGroups(horizontalWagon), /isolated wagon/i);

  const brokenHorizontal = createRailroadRanchTrainGrid();
  brokenHorizontal[3]![19] = 0;
  assert.throws(() => createHorizontalTrainPlacementGroups(brokenHorizontal), /two engines and at least one wagon/i);

  const interruptedVertical = createRailroadRanchTrainGrid();
  interruptedVertical[12]![2] = 0;
  assert.throws(() => createVerticalTrainPlacementGroups(interruptedVertical), /contiguous wagons/i);

  const isolatedVertical = createRailroadRanchTrainGrid();
  isolatedVertical[0]![0] = 93;
  assert.throws(() => createVerticalTrainPlacementGroups(isolatedVertical), /two engines/i);
});
