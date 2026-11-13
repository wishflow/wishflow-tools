import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createCampaignMapUnitPlacements } from '../src/content/campaign-map-unit-placements';
import map from '../src/content/oregon-01.json';
import { createOregon01MapContent } from '../src/content/oregon-01-map-entities';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Eastwood creates every unlocked fresh-game unit marker with its APK activity and cell', () => {
  const unlockedTypes = new Set([1, 2, 3, 4]);
  const content = createOregon01MapContent((typeId) => unlockedTypes.has(typeId));
  const freshPlacements = createCampaignMapUnitPlacements(map.originalTileGrid).filter(({ activity, unitTypeId }) => (
    (activity === 5 && unitTypeId !== 9) || unlockedTypes.has(unitTypeId)
  ));
  const unitTypeById = new Map([
    [1, 'gunslinger'], [2, 'mexican'], [3, 'cannon'], [4, 'indian'], [5, 'sniper'],
    [6, 'grandpa'], [9, 'gambler'], [35, 'pyromaniac'], [36, 'salesman'],
  ]);

  assert.deepEqual(content.units.map(({ type, activity, cell }) => ({ type, activity, cell })), freshPlacements.map(({
    unitTypeId,
    activity,
    cell,
  }) => ({
    type: unitTypeById.get(unitTypeId),
    activity,
    cell,
  })));
  assert.equal(content.units.some(({ type }) => type === 'gambler'), false);
  assert.equal(content.scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);

  const gamblerContent = createOregon01MapContent((typeId) => unlockedTypes.has(typeId) || typeId === 9);
  assert.equal(gamblerContent.units.filter(({ type }) => type === 'gambler').length, 1);
  assert.equal(gamblerContent.scene.decorations?.filter(({ asset }) => asset === 'b_3x2_casino').length, 1);
  assert.deepEqual(gamblerContent.gambler?.unlockedPrizeUnitTypes, [1, 2, 3, 4]);
});

test('Eastwood hides both Gambler entities until unlocked and maps the APK tree marker', () => {
  const locked = createOregon01MapContent(() => false);
  const treeCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 79 ? [{ x, y }] : []
  )));
  const trees = locked.scene.decorations?.filter(({ asset }) => asset === 'e_1x1_tree_green_a') ?? [];
  const treeAsset = path.join(appRoot, 'public/assets', gameAssetRelativePath('e_1x1_tree_green_a'));

  assert.equal(locked.units.some(({ type }) => type === 'gambler'), false);
  assert.equal(locked.scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);
  assert.deepEqual(trees.map(({ cell }) => cell), treeCells);
  assert.equal(trees.length, 10);
  assert.equal(existsSync(treeAsset), true);
  const png = readFileSync(treeAsset);
  assert.equal(png.toString('ascii', 1, 4), 'PNG');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [48, 78]);
});

test('Eastwood Gambler templates do not add duplicate map hires', () => {
  const unlockedTypes = new Set([1, 2, 3, 4, 5, 6, 9, 35, 36]);
  const content = createOregon01MapContent((typeId) => unlockedTypes.has(typeId));
  const templates = content.gambler?.prizeTemplates;

  assert.deepEqual(content.gambler?.unlockedPrizeUnitTypes, [1, 2, 3, 4, 5, 6, 35, 36]);
  assert.deepEqual(Object.entries(templates ?? {}).map(([unitType, unit]) => [Number(unitType), unit.type]), [
    [1, 'gunslinger'],
    [2, 'mexican'],
    [3, 'cannon'],
    [4, 'indian'],
    [5, 'sniper'],
    [6, 'grandpa'],
    [35, 'pyromaniac'],
    [36, 'salesman'],
  ]);
  assert.deepEqual(content.units.filter(({ type }) => type === 'sniper').length, 1);
  assert.deepEqual(content.units.filter(({ type }) => type === 'grandpa').length, 4);
  assert.deepEqual(content.units.filter(({ type }) => type === 'pyromaniac').length, 1);
  assert.deepEqual(content.units.filter(({ type }) => type === 'salesman').length, 1);
  assert.equal(content.units.some(({ type }) => type === 'cannon' || type === 'indian'), false);
  assert.equal(content.units.filter(({ type }) => type === 'gambler').length, 1);
});
