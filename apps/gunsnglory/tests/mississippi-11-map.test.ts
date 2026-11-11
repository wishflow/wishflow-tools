import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-11.json';
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

test('Traveller’s Town grid matches the APK map14 and its Mississippi terrain layers', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_14.tdm'));
  assert.equal(tdm.length, 770);
  assert.equal(createHash('sha256').update(tdm).digest('hex'), 'd9f427f446ffe19882050a8c989d3fbbd6d130806e83609a056d67f9c686e482');
  assert.deepEqual([...tdm.subarray(0, 2)], [32, 24]);
  assert.equal(map.id, 'travellers-town');
  assert.equal(map.source.resource, 'res/raw/td_map_14.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.equal(map.originalTileGrid.length, 24);
  assert.ok(map.originalTileGrid.every((row) => row.length === 32));
  assert.deepEqual(map.originalTileGrid.flat(), [...tdm.subarray(2)]);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 6);
  assert.equal(map.map.streets.filter(({ asset }) => asset.startsWith('tiles_bridge_pier_')).length, 6);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_railway_hori').length, 21);
});

test('Mississippi atlases use original mdpi and hdpi art at the renderer’s 1.5 source scale', () => {
  const regionAssets = Object.values(regionAtlasAliases);
  for (const asset of regionAssets) {
    const mdpiPath = path.join(appRoot, 'public/assets', `${asset}.png`);
    const hdpiPath = path.join(appRoot, 'public/assets/hdpi', `${asset}.png`);
    assert.ok(existsSync(mdpiPath), `${asset} mdpi atlas is bundled`);
    assert.ok(existsSync(hdpiPath), `${asset} hdpi atlas is bundled`);
    assert.equal(gameAssetRelativePath(asset), `hdpi/${asset}.png`);
    assert.equal(gameAssetSourceScale(asset), 1.5);

    const mdpi = pngDimensions(mdpiPath);
    const hdpi = pngDimensions(hdpiPath);
    assert.deepEqual(hdpi, { width: mdpi.width * 1.5, height: mdpi.height * 1.5 }, `${asset} preserves APK density dimensions`);
  }

  for (const tile of [...map.map.background, ...map.map.streets]) {
    const { width, height } = pngDimensions(path.join(appRoot, 'public/assets', gameAssetRelativePath(tile.asset)));
    const sourceScale = gameAssetSourceScale(tile.asset);
    assert.ok(tile.source.x + tile.source.width <= width / sourceScale, `${tile.asset} source x-range is within the atlas`);
    assert.ok(tile.source.y + tile.source.height <= height / sourceScale, `${tile.asset} source y-range is within the atlas`);
  }
});
