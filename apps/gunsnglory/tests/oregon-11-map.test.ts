import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-11.json';
import { createOregon11MapScene } from '../src/content/oregon-11-scene';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Loot Lakes raw TDM and Dakota render layers match the APK-derived reference', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_34.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'loot-lakes');
  assert.equal(map.source.resource, 'res/raw/td_map_34.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 387, 16: 42, 32: 97, 36: 60, 40: 1, 41: 1, 42: 1, 48: 3,
    52: 9, 53: 7, 54: 17, 55: 2, 56: 5, 57: 2, 58: 1, 69: 12,
    70: 3, 71: 4, 74: 1, 76: 7, 80: 2, 88: 6, 96: 15, 97: 12,
    98: 3, 100: 1, 101: 3, 102: 2, 110: 2, 112: 1, 116: 2,
    124: 44, 125: 8, 126: 1, 130: 1, 131: 1, 132: 1, 150: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 32 * 24);
  assert.ok([...map.map.background, ...map.map.streets].every(({ asset }) => !asset.startsWith('miss_tiles_')));

  const scene = createOregon11MapScene();
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));

  const tiles = [...map.map.background, ...map.map.streets];
  for (const asset of new Set(tiles.map(({ asset }) => asset))) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} is bundled`);
    const { width, height } = pngDimensions(assetPath);
    const sourceScale = gameAssetSourceScale(asset);
    for (const tile of tiles.filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= width / sourceScale, `${asset} source x-range is in atlas`);
      assert.ok(tile.source.y + tile.source.height <= height / sourceScale, `${asset} source y-range is in atlas`);
    }
  }
});
