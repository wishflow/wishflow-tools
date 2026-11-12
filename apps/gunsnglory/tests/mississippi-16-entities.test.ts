import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createMississippi16MapUnits } from '../src/content/mississippi-16-units';
import { createMississippi16SteamerUnits } from '../src/content/mississippi-16-steamer';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function assertUnitAssetsAreBundled(units: ReturnType<typeof createMississippi16MapUnits>) {
  for (const asset of new Set(units.flatMap(({ asset, awakeAsset }) => [asset, awakeAsset].filter(Boolean)))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset!))), `${asset} is bundled`);
  }
}

test('Highpoint Terrace fresh-game map units follow activity-5 and special-unit markers', () => {
  const units = createMississippi16MapUnits();
  assert.deepEqual(units.map(({ type, activity, cell, asset }) => [type, activity, cell.x, cell.y, asset]), [
    ['gunslinger', 5, 13, 8, 'player_gunslinger'],
    ['cannon', 5, 8, 13, 'player_cannon'],
    ['mexican', 5, 17, 16, 'player_mexican'],
  ]);
  assert.equal(new Set(units.map(({ id }) => id)).size, 3);
  assert.ok(units.every(({ activity }) => activity === 5));
  assertUnitAssetsAreBundled(units);
});

test('Highpoint Terrace Pyromaniac and Salesman appear only in the saved unlock snapshot', () => {
  const units = createMississippi16MapUnits(['campaign-nevada-10', 'campaign-alaska-10']);
  assert.deepEqual(units
    .filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
    .map(({ type, activity, cell, asset }) => [type, activity, cell.x, cell.y, asset]), [
      ['salesman', 4, 9, 7, 'player_salesman_sleep'],
      ['pyromaniac', 4, 22, 7, 'player_pyromaniac_sleep'],
    ]);
  assert.equal(new Set(units.map(({ id }) => id)).size, units.length);
  assertUnitAssetsAreBundled(units);
});

test('Highpoint Terrace Steamer group follows map19 markers and water movement', () => {
  const units = createMississippi16SteamerUnits();
  assert.equal(units.length, 7);
  assert.equal(new Set(units.map(({ id }) => id)).size, 7);
  assert.equal(new Set(units.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.deepEqual(units.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['steamer-30', 5, 9, 22], ['steamer-31', 5, 10, 22],
    ['steamer-32', 4, 11, 22], ['steamer-32', 4, 12, 22],
    ['steamer-32', 4, 13, 22], ['steamer-32', 4, 14, 22], ['steamer-33', 5, 15, 22],
  ]);
  assert.ok(units.every(({ movementSurface }) => movementSurface === 'water'));
});
