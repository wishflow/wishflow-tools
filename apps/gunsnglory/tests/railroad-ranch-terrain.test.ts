import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-09.json';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const expectedFrequency: Readonly<Record<number, number>> = {
  0: 345, 16: 10, 32: 124, 36: 88, 40: 1, 41: 1, 48: 2, 52: 4, 53: 4, 54: 14,
  56: 1, 58: 4, 60: 1, 68: 8, 69: 6, 70: 6, 71: 6, 72: 1, 73: 6, 74: 1, 75: 6,
  76: 14, 77: 1, 81: 3, 82: 30, 83: 6, 84: 7, 86: 3, 87: 3, 89: 10, 90: 24,
  91: 6, 92: 4, 93: 2, 94: 3, 95: 3, 102: 4, 110: 4, 116: 1, 117: 1,
};

const tdmBytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_09.tdm'));
const width = tdmBytes.readUInt8(0);
const height = tdmBytes.readUInt8(1);
const tdmGrid = Array.from({ length: height }, (_, y) => (
  Array.from(tdmBytes.subarray(2 + (y * width), 2 + ((y + 1) * width)))
));

test('Railroad Ranch preserves the original 32×24 APK TDM grid and tile frequencies', () => {
  assert.equal(map.id, 'railroad-ranch');
  assert.equal(map.source.resource, 'res/raw/td_map_09.tdm');
  assert.deepEqual([...tdmBytes.subarray(0, 2)], [32, 24]);
  assert.equal(tdmBytes.length, 2 + (32 * 24));
  assert.equal(map.map.width, 32);
  assert.equal(map.map.height, 24);
  assert.equal(map.map.tileSize, 32);
  assert.equal(map.originalTileGrid.length, 24);

  for (let y = 0; y < 24; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, 32, `row ${y} has 32 cells`);
    for (let x = 0; x < 32; x += 1) {
      assert.equal(map.originalTileGrid[y]?.[x], tdmGrid[y]?.[x], `TDM cell (${x},${y})`);
    }
  }

  const frequency = new Map<number, number>();
  for (const code of tdmBytes.subarray(2)) frequency.set(code, (frequency.get(code) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries([...frequency].sort(([left], [right]) => left - right)), expectedFrequency);
  assert.deepEqual(map.units, []);
});

test('Railroad Ranch background and street draw commands match the APK-derived renderer', () => {
  const expected = deriveOriginalTdmMapDrawCommands({ originalTileGrid: tdmGrid }, { bridgeTileCodes: [81] });
  assert.equal(map.map.background.length, 32 * 24);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);

  const horizontalBridgeCells = tdmGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 81 ? [{ x, y }] : []
  )));
  const horizontalBridgeDecks = map.map.streets.filter((tile) => tile.asset === 'tiles_bridge_hori');
  assert.deepEqual(horizontalBridgeDecks.map(({ x, y }) => [x, y]), horizontalBridgeCells.map(({ x, y }) => [x - 0.25, y]));
  assert.deepEqual(horizontalBridgeDecks.map(({ x, y }) => [x, y]), [[14.75, 3], [25.75, 3], [13.75, 17]]);

  const horizontalBridgePiers = map.map.streets.filter((tile) => tile.asset.startsWith('tiles_bridge_pier_'));
  assert.deepEqual(horizontalBridgePiers.map(({ asset, x, y }) => [asset, x, y]), [
    ['tiles_bridge_pier_left', 14.75, 3.75],
    ['tiles_bridge_pier_right', 15.5, 3.75],
    ['tiles_bridge_pier_left', 25.75, 3.75],
    ['tiles_bridge_pier_right', 26.5, 3.75],
    ['tiles_bridge_pier_left', 13.75, 17.75],
    ['tiles_bridge_pier_right', 14.5, 17.75],
  ]);

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
