import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-03.json';
import { createOregon03MapScene } from '../src/content/oregon-03-scene';
import { oregon03RouteDefinitions, oregon03SpawnPointIdByActionId } from '../src/content/oregon-03-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import terrainReference from './fixtures/oregon-03-terrain-reference.json';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

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

function routePath(route: (typeof oregon03RouteDefinitions)[number]): string {
  return [
    cellKey(route.spawn.cell),
    ...route.redirects.map(({ cell }) => cellKey(cell)),
    cellKey(route.exit),
  ].join('|');
}

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

test('Chinook Woods TDM, Oregon render layers, collision, and terrain candidates match the APK-derived data', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_26.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '52182041674cfc923121ce2d57953eb2b1722b62916da502541f529830b44aa7');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'chinook-woods');
  assert.equal(map.source.resource, 'res/raw/td_map_26.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 80);
  assert.equal(map.map.streets.filter(({ asset }) => asset.startsWith('miss_tiles_path')).length, 30);
  assert.equal(terrainReference.width, 32);
  assert.equal(terrainReference.height, 24);
  assert.equal(terrainReference.backgroundCandidates.flat().filter((candidates) => candidates[0] !== 0).length, 426);
  assert.equal(terrainReference.streetCandidates.flat().filter((candidates) => candidates.some((code) => code !== 0)).length, 72);
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

  const scene = createOregon03MapScene();
  const collision = scene.backgroundCollisionCodes ?? [];
  const deterministicBackground = deriveOriginalBackgroundCodesForTest(map);
  assert.deepEqual(collision, deterministicBackground);
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

  for (const asset of new Set([...map.map.background, ...map.map.streets].map(({ asset }) => asset))) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} render asset is bundled`);
    const { width, height } = pngDimensions(assetPath);
    const sourceScale = gameAssetSourceScale(asset);
    for (const tile of [...map.map.background, ...map.map.streets].filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= width / sourceScale, `${asset} source x-range is in atlas`);
      assert.ok(tile.source.y + tile.source.height <= height / sourceScale, `${asset} source y-range is in atlas`);
    }
  }
});

test('Chinook Woods routes exactly match all APK spawn-to-exit paths', () => {
  const rowMajorSpawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(rowMajorSpawnCells, [[22, 0], [31, 9], [31, 16]]);
  assert.deepEqual(oregon03SpawnPointIdByActionId, { 0: 1, 1: 0, 2: 2 });

  const actualPaths = oregon03RouteDefinitions.map(routePath);
  assert.deepEqual(actualPaths, [
    '22,0|22,5|17,5|17,14|24,14|24,18|9,18|9,14|13,14|13,9|9,9|9,3|0,3',
    '31,9|28,9|28,6|18,6|18,13|25,13|25,19|8,19|8,4|0,4',
    '31,16|26,16|26,20|7,20|7,14|3,14|3,9|7,9|7,5|0,5',
  ]);
  assert.equal(oregon03RouteDefinitions.length, 3);
  assert.equal(new Set(oregon03RouteDefinitions.flatMap(({ redirects }) => redirects.map(({ cell }) => cellKey(cell)))).size, 27);

  const edges = new Set<string>();
  for (const route of oregon03RouteDefinitions) {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
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
  assert.equal(new Set(oregon03RouteDefinitions.map(({ spawn }) => cellKey(spawn.cell))).size, 3);
  assert.equal(new Set(oregon03RouteDefinitions.map(({ exit }) => cellKey(exit))).size, 3);
  assert.equal(edges.size, 30);
});
