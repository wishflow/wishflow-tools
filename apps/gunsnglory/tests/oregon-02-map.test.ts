import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-02.json';
import { createOregon02MapScene } from '../src/content/oregon-02-scene';
import { oregon02RouteDefinitions, oregon02SpawnPointIdByActionId } from '../src/content/oregon-02-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import terrainReference from './fixtures/cashcow-canyon-terrain-reference.json';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const oregonAtlasAliases: Readonly<Record<string, string>> = Object.freeze({
  tiles_canyon: 'miss_tiles_canyon',
  tiles_canyon_wall_var: 'miss_tiles_canyon_wall_var',
  tiles_desert: 'miss_tiles_desert',
  tiles_desert_var: 'miss_tiles_desert_var',
  tiles_waterside: 'miss_tiles_waterside',
  tiles_waterside_var: 'miss_tiles_waterside_var',
  tiles_path: 'miss_tiles_path',
  tiles_path_var: 'miss_tiles_path_var',
});

function applyOregonAtlases<T extends { asset: string }>(tiles: readonly T[]): T[] {
  return tiles.map((tile) => ({ ...tile, asset: oregonAtlasAliases[tile.asset] ?? tile.asset }));
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function routePath(route: (typeof oregon02RouteDefinitions)[number]): string {
  return [
    cellKey(route.spawn.cell),
    ...route.redirects.map(({ cell }) => cellKey(cell)),
    cellKey(route.exit),
  ].join('|');
}

// Paths are transcribed from static-route-graph.json map_index 25.
const expectedPaths = [
  '0,4|3,4|3,2|4,2|10,2|10,5|17,5|17,2|23,2|23,7|31,7',
  '0,5|4,5|4,2|10,2|10,5|17,5|17,2|23,2|23,7|31,7',
  '0,5|4,5|4,9|10,9|10,6|17,6|17,8|31,8',
  '0,5|4,5|4,9|10,9|10,11|17,11|17,9|25,9|31,9',
  '0,6|3,6|3,9|4,9|10,9|10,6|17,6|17,8|31,8',
  '0,6|3,6|3,9|4,9|10,9|10,11|17,11|17,9|25,9|31,9',
  '0,11|3,11|3,9|4,9|10,9|10,6|17,6|17,8|31,8',
  '0,11|3,11|3,9|4,9|10,9|10,11|17,11|17,9|25,9|31,9',
  '0,12|4,12|4,9|10,9|10,6|17,6|17,8|31,8',
  '0,12|4,12|4,9|10,9|10,11|17,11|17,9|25,9|31,9',
  '0,12|4,12|4,15|10,15|10,12|17,12|17,16|21,16|21,19|25,19|25,9|31,9',
  '0,13|3,13|3,16|4,16|10,16|10,23|14,23|14,21|18,21|18,20|21,20|21,19|25,19|25,9|31,9',
  '0,13|3,13|3,16|4,16|4,23|10,23|14,23|14,21|18,21|18,20|21,20|21,19|25,19|25,9|31,9',
];

function selectedStreetCodeGrid(): number[][] {
  const codes = Array.from({ length: map.map.height }, () => Array.from({ length: map.map.width }, () => 0));
  const streetAtlasRemap = [7, 10, 8, 4, 9, 2, 1, 15, 11, 3, 0, 13, 5, 12, 14, 6];

  for (const tile of map.map.streets) {
    let x = tile.x;
    let y = tile.y;
    let code: number | undefined;
    if (tile.asset === 'miss_tiles_path') {
      const atlasIndex = ((tile.source.y / 32) * 4) + (tile.source.x / 32);
      const remapIndex = streetAtlasRemap.indexOf(atlasIndex);
      assert.notEqual(remapIndex, -1, `unknown path atlas cell ${atlasIndex}`);
      code = 16 + remapIndex;
    } else if (tile.asset === 'miss_tiles_path_var') {
      const variantIndex = tile.source.x / 32;
      code = variantIndex < 3 ? 20 + variantIndex : 26 + variantIndex;
    } else if (tile.asset === 'tiles_bridge_hori') {
      x += 0.25;
      code = 64;
    } else if (tile.asset === 'tiles_bridge_verti') {
      y += 0.25;
      code = 76;
    } else if (tile.asset === 'tiles_railway_hori') {
      const marker = map.originalTileGrid[y]?.[x];
      code = marker === 81 ? 68 : 72;
    } else if (tile.asset === 'tiles_railway_verti') {
      const marker = map.originalTileGrid[y]?.[x];
      code = marker === 89 ? 80 : 84;
    } else if (!tile.asset.startsWith('tiles_bridge_pier_')) {
      assert.fail(`unexpected street asset ${tile.asset}`);
    }

    if (code === undefined) continue;
    assert.equal(Number.isInteger(x) && Number.isInteger(y), true, `${tile.asset} maps to a TDM cell`);
    codes[y]![x] = code;
  }
  return codes;
}

test('Cashcow Canyon TDM and Oregon render layers match the APK-derived map', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_25.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '20ff05e2b9c777f904c4bffd829c4fe7682010eac4af7ecef761a22d1e9deca4');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'cashcow-canyon');
  assert.equal(map.source.resource, 'res/raw/td_map_25.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 42);
  assert.equal(terrainReference.streetCandidates.flat().filter((candidates) => candidates.some((code) => code !== 0)).length, 34);
  assert.equal(terrainReference.horizontalBridgePierPlacements.length, 8);

  const pierPlacements = map.map.streets
    .filter(({ asset }) => asset.startsWith('tiles_bridge_pier_'))
    .map((tile) => ({
      x: tile.asset.endsWith('_left') ? tile.x + 0.25 : tile.x - 0.5,
      y: tile.y - 0.75,
      side: tile.asset.endsWith('_left') ? 'left' : 'right',
      atlas: tile.asset,
    }));
  assert.deepEqual(pierPlacements, terrainReference.horizontalBridgePierPlacements);

  const scene = createOregon02MapScene();
  const collision = scene.backgroundCollisionCodes ?? [];
  assert.equal(collision.length, terrainReference.height);
  assert.ok(collision.every((row) => row.length === terrainReference.width && row.every(Number.isInteger)));
  for (let y = 0; y < terrainReference.height; y += 1) {
    for (let x = 0; x < terrainReference.width; x += 1) {
      assert.ok(terrainReference.backgroundCandidates[y]![x]!.includes(collision[y]![x]!), `background (${x},${y}) is an APK candidate`);
    }
  }

  const streetCodes = selectedStreetCodeGrid();
  for (let y = 0; y < terrainReference.height; y += 1) {
    for (let x = 0; x < terrainReference.width; x += 1) {
      assert.ok(terrainReference.streetCandidates[y]![x]!.includes(streetCodes[y]![x]!), `street (${x},${y}) is an APK candidate`);
    }
  }

  const tiles = [...map.map.background, ...map.map.streets];
  for (const asset of new Set(tiles.map(({ asset }) => asset))) {
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

test('Cashcow Canyon routes exactly match all APK spawn-to-exit paths', () => {
  const rowMajorSpawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(rowMajorSpawnCells, [[0, 4], [0, 5], [0, 6], [0, 11], [0, 12], [0, 13]]);
  assert.deepEqual(oregon02SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 });

  const actualPaths = oregon02RouteDefinitions.map(routePath);
  assert.deepEqual(actualPaths, expectedPaths);
  assert.equal(new Set(actualPaths.map((pathValue) => pathValue.split('|').slice(1, -1).join('|'))).size, 13);

  const edges = new Set<string>();
  const redirectCells = new Set<string>();
  for (const route of oregon02RouteDefinitions) {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    for (const redirect of route.redirects) redirectCells.add(cellKey(redirect.cell));
    for (const cell of cells) {
      assert.ok(cell.x >= 0 && cell.x < map.map.width && cell.y >= 0 && cell.y < map.map.height, `route cell ${cellKey(cell)} remains in bounds`);
    }
    let direction = route.spawn.direction;
    for (let index = 1; index < cells.length; index += 1) {
      const from = cells[index - 1]!;
      const to = cells[index]!;
      edges.add(`${cellKey(from)}:${direction}->${cellKey(to)}`);
      const redirect = route.redirects[index - 1];
      if (redirect) direction = redirect.directions[0]!;
    }
  }
  assert.equal(oregon02RouteDefinitions.length, 13);
  assert.equal(redirectCells.size, 42);
  assert.equal(new Set(oregon02RouteDefinitions.map(({ spawn }) => cellKey(spawn.cell))).size, 6);
  assert.equal(new Set(oregon02RouteDefinitions.map(({ exit }) => cellKey(exit))).size, 3);
  assert.equal(edges.size, 52);
});
