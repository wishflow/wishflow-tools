import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-09.json';
import { createCampaignMapUnitPlacements } from '../src/content/campaign-map-unit-placements';
import { createOregon09DynamiteFromUnlock } from '../src/content/oregon-09-dynamite';
import { createOregon09MapContent } from '../src/content/oregon-09-map-entities';
import { createOregon09MapScene } from '../src/content/oregon-09-scene';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const decorationAssetByCode: Readonly<Record<number, string>> = Object.freeze({
  69: 'e_1x1_rocks_a',
  70: 'e_1x1_rocks_b',
  79: 'e_1x1_tree_green_a',
  115: 'e_1x1_tree_green_b',
  116: 'b_2x1_shack',
  118: 'e_1x1_tree_stump',
  119: 'e_1x1_tree_green_c',
  126: 'e_1x1_rocks_water',
});

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function unitsUnlocked(ids: readonly number[]) {
  const unlocks = new Set(ids);
  return (unitTypeId: number) => unlocks.has(unitTypeId);
}

test('Snake River scenery and hire units are generated from every matching TDM marker', () => {
  const scene = createOregon09MapScene();
  const expectedDecorations = Object.entries(decorationAssetByCode).flatMap(([rawCode, asset]) => {
    const code = Number(rawCode);
    return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
      value === code ? [`${cellKey({ x, y })}:${asset}`] : []
    )));
  }).sort();
  const actualDecorations = (scene.decorations ?? []).map(({ cell, asset }) => `${cellKey(cell)}:${asset}`).sort();
  assert.deepEqual(actualDecorations, expectedDecorations);

  const placements = createCampaignMapUnitPlacements(map.originalTileGrid);
  assert.deepEqual(Object.fromEntries([...new Set(placements.map(({ sourceCode }) => sourceCode))]
    .sort((a, b) => a - b)
    .map((sourceCode) => [sourceCode, placements.filter(({ sourceCode: code }) => code === sourceCode).length])), {
    100: 1, 101: 19, 130: 1, 131: 1,
  });
  const expectedUnitCells: Readonly<Record<number, readonly string[]>> = {
    100: ['16,5'],
    101: ['9,1', '2,5', '13,6', '19,6', '27,6', '6,7', '15,9', '18,9', '26,9', '7,11',
      '2,12', '6,14', '27,14', '17,16', '22,17', '11,18', '25,19', '2,20', '21,22'],
    130: ['5,22'],
    131: ['31,13'],
  };
  for (const [rawCode, cells] of Object.entries(expectedUnitCells)) {
    assert.deepEqual(placements.filter(({ sourceCode }) => sourceCode === Number(rawCode))
      .map(({ cell }) => cellKey(cell)).sort(), [...cells].sort(), `marker ${rawCode} coordinates`);
  }

  const locked = createOregon09MapContent(() => false);
  assert.equal(locked.units.length, 4, 'only the four Steamer components exist while all map hires are locked');
  const unlocked = createOregon09MapContent(unitsUnlocked([5, 6, 35, 36]));
  assert.equal(unlocked.units.length, 26);
  assert.equal(new Set(unlocked.units.map(({ id }) => id)).size, unlocked.units.length);
  assert.deepEqual(unlocked.units.filter(({ type }) => ['sniper', 'grandpa', 'pyromaniac', 'salesman'].includes(type))
    .map(({ type, activity, cell }) => [type, activity, cell.x, cell.y])
    .sort((left, right) => String(left).localeCompare(String(right))), [
    ['grandpa', 4, 9, 1], ['grandpa', 4, 2, 5], ['grandpa', 4, 13, 6], ['grandpa', 4, 19, 6],
    ['grandpa', 4, 27, 6], ['grandpa', 4, 6, 7], ['grandpa', 4, 15, 9], ['grandpa', 4, 18, 9],
    ['grandpa', 4, 26, 9], ['grandpa', 4, 7, 11], ['grandpa', 4, 2, 12], ['grandpa', 4, 6, 14],
    ['grandpa', 4, 27, 14], ['grandpa', 4, 17, 16], ['grandpa', 4, 22, 17], ['grandpa', 4, 11, 18],
    ['grandpa', 4, 25, 19], ['grandpa', 4, 2, 20], ['grandpa', 4, 21, 22],
    ['pyromaniac', 4, 5, 22], ['salesman', 4, 31, 13], ['sniper', 4, 16, 5],
  ].sort((left, right) => String(left).localeCompare(String(right))));

  for (const { asset } of scene.decorations ?? []) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Snake River Dynamite uses every APK trigger and nearest box pair', () => {
  const dynamite = createOregon09DynamiteFromUnlock(true);
  assert.equal(dynamite.unlocked, true);
  assert.equal(dynamite.pairs.length, 11);
  assert.deepEqual(dynamite.pairs.map(({ triggerCell, boxCell }) => `${cellKey(triggerCell)}->${cellKey(boxCell)}`), [
    '23,5->23,7', '9,7->9,6', '1,8->2,9', '12,8->12,10', '24,10->24,12', '18,14->18,13',
    '7,15->7,17', '1,16->2,17', '30,17->30,19', '27,19->27,21', '19,21->19,20',
  ]);
});

test('Snake River Steamer preserves each component marker and the sleeping cannon state', () => {
  const steamer = createOregon09MapContent(unitsUnlocked([5, 6, 35, 36])).units
    .filter(({ movementGroupId }) => movementGroupId?.startsWith('oregon-09-steamer-'));
  assert.deepEqual(steamer.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['steamer-30', 5, 24, 2], ['steamer-31', 5, 25, 2], ['steamer-32', 4, 26, 2], ['steamer-33', 5, 27, 2],
  ]);
  assert.equal(new Set(steamer.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.equal(steamer.find(({ type }) => type === 'steamer-32')?.weapon?.damage, 650);
  assert.equal(steamer.find(({ type }) => type === 'steamer-32')?.hirePrice, 150);
});
