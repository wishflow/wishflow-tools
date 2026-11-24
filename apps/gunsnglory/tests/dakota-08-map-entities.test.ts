import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-08.json';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import { createDakota08MapUnits, createDakota08SteamerUnits } from '../src/content/dakota-08-units';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const sceneryByCode: Readonly<Record<number, { asset: string; cells: readonly (readonly [number, number])[] }>> = {
  69: { asset: 'e_1x1_rocks_snow_a', cells: [[13, 0], [24, 8], [31, 9], [9, 14], [3, 17], [31, 22], [4, 23]] },
  70: { asset: 'e_1x1_rocks_snow_b', cells: [[30, 0], [23, 15], [29, 18], [0, 20]] },
  71: { asset: 'e_1x1_tree_snow', cells: [[24, 1], [31, 3], [0, 5], [31, 14], [17, 21], [9, 22]] },
  74: { asset: 'b_1x1_windmill', cells: [[16, 15]] },
  76: { asset: 'e_1x1_bush', cells: [[29, 3], [3, 4], [9, 5], [5, 19], [27, 20], [18, 23]] },
  112: { asset: 'b_3x2_saloon', cells: [[29, 12]] },
  113: { asset: 'b_3x2_fort', cells: [[2, 12]] },
  126: { asset: 'e_1x1_rocks_water', cells: [[13, 10], [18, 13]] },
};

function cellsForMarker(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

test('Wayne Waters scenery decodes each TDM object marker to its APK image and cell', () => {
  const scene = createDakota08MapScene();
  const decorations = scene.decorations ?? [];
  const expected = Object.entries(sceneryByCode).flatMap(([markerText, definition]) => {
    const marker = Number(markerText);
    assert.deepEqual(cellsForMarker(marker), definition.cells, `raw ${marker} source cells`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(definition.asset))), `${definition.asset} is bundled`);
    return definition.cells.map(([x, y]) => `${x},${y}:${definition.asset}`);
  }).sort();
  const actual = decorations.map(({ cell, asset }) => `${cell.x},${cell.y}:${asset}`).sort();
  assert.deepEqual(actual, expected);
  assert.equal(decorations.length, 28);
  assert.deepEqual(scene.originalTileGrid, map.originalTileGrid);
  assert.deepEqual(decorations.filter(({ asset }) => asset === 'b_3x2_saloon' || asset === 'b_3x2_fort')
    .map(({ asset, anchorOffsetY, cell }) => [asset, anchorOffsetY, cell.x, cell.y]), [
    ['b_3x2_fort', -0.3, 2, 12],
    ['b_3x2_saloon', -0.3, 29, 12],
  ]);
});

test('Wayne Waters map hires respect milestone gates and Steamer markers expand to five unique parts', () => {
  const locked = createDakota08MapUnits();
  const allUnlocked = createDakota08MapUnits(completedScenarioIdsForMississippiUnitUnlockSnapshot({
    grandpa: true, sniper: true, pyromaniac: true, salesman: true,
  }));
  const sleepingExpectations = [
    { marker: 96, type: 'gunslinger', cells: [[12, 1], [17, 1], [25, 1], [11, 7], [29, 7], [7, 8], [21, 8], [14, 13], [23, 13], [3, 15], [7, 15], [27, 16], [28, 19], [9, 20], [15, 20]] },
    { marker: 97, type: 'mexican', cells: [[5, 1], [22, 1], [28, 5], [0, 8], [14, 8], [10, 9], [23, 10], [9, 13], [5, 21], [29, 21], [15, 22]] },
    { marker: 98, type: 'cannon', cells: [[8, 1], [20, 1], [4, 3], [25, 3], [30, 15], [2, 18], [18, 21], [25, 21], [10, 22]] },
    { marker: 99, type: 'indian', cells: [[1, 1], [21, 6], [8, 11], [0, 16]] },
    { marker: 100, type: 'sniper', cells: [[1, 22]] },
    { marker: 101, type: 'grandpa', cells: [[27, 1], [2, 9], [12, 13], [31, 18], [27, 23]] },
  ] as const;

  for (const expected of sleepingExpectations) {
    const markerCells = cellsForMarker(expected.marker);
    assert.deepEqual(markerCells, expected.cells, `raw ${expected.marker} coordinates`);
    const units = allUnlocked.filter(({ type, activity }) => type === expected.type && activity === 4);
    assert.deepEqual(units.map(({ cell }) => [cell.x, cell.y]), expected.cells, `${expected.type} units`);
  }
  assert.equal(locked.filter(({ activity }) => activity === 4).length, 39 + 2,
    'the default profile creates 39 available TDM hires and two sleeping Steamer Cannons');
  assert.equal(locked.some(({ type, activity }) => activity === 4 && (type === 'sniper' || type === 'grandpa')), false);
  assert.deepEqual(allUnlocked.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
    .map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['salesman', 4, 9, 6], ['pyromaniac', 4, 18, 16],
  ]);
  assert.equal(allUnlocked.length, 52, 'all 45 standard hires, two special hires, and five Steamer parts are present');
  assert.equal(new Set(allUnlocked.map(({ id }) => id)).size, allUnlocked.length, 'all TDM units have unique IDs');

  const steamer = createDakota08SteamerUnits();
  assert.deepEqual(steamer.map(({ type, activity, cell, asset }) => [type, activity, cell.x, cell.y, asset]), [
    ['steamer-30', 5, 11, 11, 'steamboat_1'],
    ['steamer-31', 5, 12, 11, 'steamboat_2'],
    ['steamer-32', 4, 13, 11, 'steamboat_3'],
    ['steamer-32', 4, 14, 11, 'steamboat_3'],
    ['steamer-33', 5, 15, 11, 'steamboat_4a'],
  ]);
  assert.equal(new Set(steamer.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.ok(steamer.every(({ movementAxis, movementSurface, movementSpeedFinePer100Ms }) => (
    movementAxis === 'horizontal' && movementSurface === 'water' && movementSpeedFinePer100Ms === 1_000
  )));
});
