import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-14.json';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const regionAtlasAliases: Readonly<Record<string, string>> = Object.freeze({
  tiles_canyon: 'miss_tiles_canyon',
  tiles_canyon_wall_var: 'miss_tiles_canyon_wall_var',
  tiles_desert: 'miss_tiles_desert',
  tiles_desert_var: 'miss_tiles_desert_var',
  tiles_waterside: 'miss_tiles_waterside',
  tiles_waterside_var: 'miss_tiles_waterside_var',
  tiles_path: 'miss_tiles_path',
  tiles_path_var: 'miss_tiles_path_var',
});

function applyMississippiAtlases<T extends { asset: string }>(tiles: readonly T[]): T[] {
  return tiles.map((tile) => ({ ...tile, asset: regionAtlasAliases[tile.asset] ?? tile.asset }));
}

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Riverside Mountains map17 matches the APK grid and deterministic Mississippi terrain', () => {
  const tdmPath = path.join(appRoot, 'public/content/maps/td_map_17.tdm');
  const bytes = readFileSync(tdmPath);
  assert.equal(bytes.length, 770);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    '8fc86d322bb644c029f4b3bb7390815403f9f3991cae7195a93f1323d961014b',
  );
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'riverside-mountains');
  assert.equal(map.source.resource, 'res/raw/td_map_17.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);

  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori')
    .map(({ x, y }) => [x + 0.25, y]), [
    [19, 5], [20, 5], [4, 6], [5, 6], [27, 6], [28, 6], [9, 20], [10, 20],
  ]);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti')
    .map(({ x, y }) => [x, y + 0.25]), [
    [24, 2], [24, 3], [24, 4], [15, 8], [15, 9], [23, 9], [15, 10], [23, 10], [23, 11],
    [13, 16], [13, 17], [26, 17], [13, 18], [26, 18], [26, 19], [6, 21], [15, 21], [6, 22], [15, 22],
  ]);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_left')
    .map(({ x, y }) => [x + 0.25, y - 0.75]), [[19, 5], [4, 6], [27, 6], [9, 20]]);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_right')
    .map(({ x, y }) => [x - 0.5, y - 0.75]), [[20, 5], [5, 6], [28, 6], [10, 20]]);

  const tiles = [...map.map.background, ...map.map.streets];
  const assets = new Set(tiles.map(({ asset }) => asset));
  for (const asset of assets) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} render asset is bundled`);
    const { width, height } = pngDimensions(assetPath);
    const sourceScale = gameAssetSourceScale(asset);
    for (const tile of tiles.filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= width / sourceScale, `${asset} source x-range is in atlas`);
      assert.ok(tile.source.y + tile.source.height <= height / sourceScale, `${asset} source y-range is in atlas`);
    }
  }
});
