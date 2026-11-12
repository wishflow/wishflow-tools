import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-12.json';
import { createMississippi12MapScene } from '../src/content/mississippi-12-scene';
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

test('Steam Valley map15 matches the APK TDM, terrain atlas crops, bridges, and piers', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_15.tdm'));
  assert.equal(tdm.length, 770);
  assert.deepEqual([...tdm.subarray(0, 2)], [32, 24]);
  assert.equal(map.id, 'steam-valley');
  assert.equal(map.source.resource, 'res/raw/td_map_15.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.equal(map.originalTileGrid.length, 24);
  assert.ok(map.originalTileGrid.every((row) => row.length === 32));
  assert.deepEqual(map.originalTileGrid.flat(), [...tdm.subarray(2)]);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 8);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length, 8);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_left').length, 5);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_right').length, 5);
});

test('Steam Valley static scenery and Mississippi background collision cover the full scene', () => {
  const scene = createMississippi12MapScene();
  const codes = scene.backgroundCollisionCodes;
  assert.equal(codes.length, 24);
  assert.ok(codes.every((row) => row.length === 32 && row.every(Number.isInteger)));

  const expectedDecorations = [
    { asset: 'e_1x1_rocks_a', cells: [[26, 11], [12, 12]] },
    { asset: 'e_1x1_tree', cells: [[5, 11], [31, 11]] },
    {
      asset: 'e_1x1_rocks_water',
      cells: [[1, 2], [8, 2], [17, 2], [29, 2], [3, 5], [15, 5], [23, 5], [27, 5],
        [7, 18], [9, 18], [20, 18], [29, 18], [1, 21], [14, 21], [27, 21]],
    },
  ];
  for (const { asset, cells } of expectedDecorations) {
    const decorations = (scene.decorations ?? []).filter((item) => item.asset === asset);
    assert.deepEqual(decorations.map(({ cell }) => [cell.x, cell.y]), cells, `${asset} marker cells`);
    if (asset === 'e_1x1_rocks_water') {
      assert.ok(decorations.every(({ collisionBoxFine }) => (
        collisionBoxFine?.x === 1920
        && collisionBoxFine.y === 2612
        && collisionBoxFine.width === 3840
        && collisionBoxFine.height === 2534
      )));
    }
  }

  const mapAssets = new Set([...map.map.background, ...map.map.streets].map(({ asset }) => asset));
  for (const asset of mapAssets) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} render asset is bundled`);
    const dimensions = pngDimensions(assetPath);
    const sourceScale = gameAssetSourceScale(asset);
    for (const tile of [...map.map.background, ...map.map.streets].filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= dimensions.width / sourceScale, `${asset} source x-range is in atlas`);
      assert.ok(tile.source.y + tile.source.height <= dimensions.height / sourceScale, `${asset} source y-range is in atlas`);
    }
  }
});

test('Steam Valley bridge draw bounds match the APK cells and original overhang', () => {
  const horizontal = map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori');
  const vertical = map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti');
  assert.deepEqual(horizontal.map(({ x, y, width, height }) => [x + 0.25, y, width, height]), [
    [3, 10, 1.5, 1], [15, 10, 1.5, 1], [16, 10, 1.5, 1], [28, 10, 1.5, 1],
    [8, 13, 1.5, 1], [9, 13, 1.5, 1], [22, 13, 1.5, 1], [23, 13, 1.5, 1],
  ]);
  assert.deepEqual(vertical.map(({ x, y, width, height }) => [x, y + 0.25, width, height]), [
    [11, 8, 1, 1.5], [26, 8, 1, 1.5], [11, 9, 1, 1.5], [26, 9, 1, 1.5],
    [5, 14, 1, 1.5], [20, 14, 1, 1.5], [5, 15, 1, 1.5], [20, 15, 1, 1.5],
  ]);
});
