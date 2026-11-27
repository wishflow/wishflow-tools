import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/nevada-02.json';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const apkMap = readFileSync(path.join(appRoot, 'public/content/maps/td_map_45.tdm'));
const fixtureMap = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_45.tdm'));
const width = apkMap.readUInt8(0);
const height = apkMap.readUInt8(1);
const tdmGrid = Array.from({ length: height }, (_, y) => (
  Array.from(apkMap.subarray(2 + (y * width), 2 + ((y + 1) * width)))
));

const expectedFrequency: Readonly<Record<number, number>> = {
  0: 244, 16: 104, 32: 133, 36: 67, 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 48: 4,
  52: 4, 53: 14, 54: 18, 55: 7, 56: 2, 58: 2, 60: 10, 61: 3, 69: 8, 71: 3,
  73: 8, 74: 1, 75: 1, 76: 3, 78: 34, 80: 1, 81: 2, 82: 13, 83: 2, 84: 2,
  86: 1, 87: 1, 88: 18, 96: 3, 97: 4, 98: 4, 99: 4, 100: 1, 101: 2, 102: 9,
  110: 9, 112: 1, 113: 1, 114: 1, 117: 3, 118: 5, 130: 5, 131: 1,
};

test('Bombington preserves the original Nevada TDM bytes, grid, and complete marker frequency', () => {
  assert.equal(map.id, 'bombington');
  assert.equal(map.source.resource, 'res/raw/td_map_45.tdm');
  assert.deepEqual([...apkMap.subarray(0, 2)], [32, 24]);
  assert.equal(apkMap.length, 2 + (32 * 24));
  assert.deepEqual(fixtureMap, apkMap);
  assert.equal(map.map.width, 32);
  assert.equal(map.map.height, 24);
  assert.equal(map.map.tileSize, 32);
  assert.deepEqual(map.originalTileGrid, tdmGrid);
  assert.deepEqual(Object.fromEntries(
    [...apkMap.subarray(2)].reduce((frequency, code) => (
      frequency.set(code, (frequency.get(code) ?? 0) + 1), frequency
    ), new Map<number, number>()),
  ), expectedFrequency);
});

test('Bombington background and street draw commands match the APK-derived Nevada renderer', () => {
  const expected = deriveOriginalTdmMapDrawCommands({ originalTileGrid: tdmGrid });
  assert.equal(map.map.background.length, 32 * 24);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);

  for (const tile of [...map.map.background, ...map.map.streets]) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(tile.asset));
    assert.ok(existsSync(assetPath), tile.asset + ' atlas must be bundled');
    const bytes = readFileSync(assetPath);
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG', tile.asset + ' is a PNG atlas');
    const atlasWidth = bytes.readUInt32BE(16) / gameAssetSourceScale(tile.asset);
    const atlasHeight = bytes.readUInt32BE(20) / gameAssetSourceScale(tile.asset);
    assert.ok(tile.source.x >= 0 && tile.source.y >= 0, tile.asset + ' crop starts inside its atlas');
    assert.ok(tile.source.x + tile.source.width <= atlasWidth, tile.asset + ' crop ends inside its atlas horizontally');
    assert.ok(tile.source.y + tile.source.height <= atlasHeight, tile.asset + ' crop ends inside its atlas vertically');
    assert.ok(tile.x >= 0 && tile.y >= 0, tile.asset + ' draw origin is inside the map');
    assert.ok(tile.x + tile.width <= map.map.width, tile.asset + ' draw ends inside the map horizontally');
    assert.ok(tile.y + tile.height <= map.map.height, tile.asset + ' draw ends inside the map vertically');
  }
});
