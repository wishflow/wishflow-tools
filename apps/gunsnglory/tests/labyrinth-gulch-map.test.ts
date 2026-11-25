import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/nevada-01.json';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const apkMap = readFileSync(path.join(appRoot, 'public/content/maps/td_map_44.tdm'));
const fixtureMap = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_44.tdm'));
const width = apkMap.readUInt8(0);
const height = apkMap.readUInt8(1);
const tdmGrid = Array.from({ length: height }, (_, y) => (
  Array.from(apkMap.subarray(2 + (y * width), 2 + ((y + 1) * width)))
));

test('Labyrinth Gulch keeps the original 32×24 Nevada TDM and route markers', () => {
  assert.equal(map.id, 'labyrinth-gulch');
  assert.equal(map.source.resource, 'res/raw/td_map_44.tdm');
  assert.deepEqual([...apkMap.subarray(0, 2)], [32, 24]);
  assert.equal(apkMap.length, 2 + (32 * 24));
  assert.deepEqual(fixtureMap, apkMap);
  assert.equal(map.map.width, 32);
  assert.equal(map.map.height, 24);
  assert.equal(map.map.tileSize, 32);
  assert.deepEqual(map.originalTileGrid, tdmGrid);
  assert.equal(map.originalTileGrid.flat().filter((code) => code >= 40 && code <= 46).length, 4);
  assert.equal(map.originalTileGrid.flat().filter((code) => code === 48).length, 2);
  assert.equal(map.originalTileGrid.flat().filter((code) => code >= 52 && code <= 65).length, 47);
});

test('Labyrinth Gulch Nevada background, street, bridge and pier commands match the APK-derived renderer', () => {
  const expected = deriveOriginalTdmMapDrawCommands({ originalTileGrid: tdmGrid });
  assert.equal(map.map.background.length, 32 * 24);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.ok(map.map.streets.some(({ asset }) => asset === 'tiles_bridge_hori'));
  assert.ok(map.map.streets.some(({ asset }) => asset === 'tiles_bridge_verti'));

  for (const tile of [...map.map.background, ...map.map.streets]) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(tile.asset));
    assert.ok(existsSync(assetPath), `${tile.asset} atlas must be bundled`);
    const bytes = readFileSync(assetPath);
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG', `${tile.asset} is a PNG atlas`);
    const atlasWidth = bytes.readUInt32BE(16) / gameAssetSourceScale(tile.asset);
    const atlasHeight = bytes.readUInt32BE(20) / gameAssetSourceScale(tile.asset);
    assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${tile.asset} crop starts inside its atlas`);
    assert.ok(tile.source.x + tile.source.width <= atlasWidth, `${tile.asset} crop ends inside its atlas horizontally`);
    assert.ok(tile.source.y + tile.source.height <= atlasHeight, `${tile.asset} crop ends inside its atlas vertically`);
    assert.ok(tile.x >= 0 && tile.y >= 0, `${tile.asset} draw origin is inside the map`);
    assert.ok(tile.x + tile.width <= map.map.width, `${tile.asset} draw ends inside the map horizontally`);
    assert.ok(tile.y + tile.height <= map.map.height, `${tile.asset} draw ends inside the map vertically`);
  }
});
