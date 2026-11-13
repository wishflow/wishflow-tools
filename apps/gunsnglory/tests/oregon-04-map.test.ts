import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-04.json';
import { createOregon04MapScene } from '../src/content/oregon-04-scene';
import { oregon04RouteDefinitions, oregon04SpawnPointIdByActionId } from '../src/content/oregon-04-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
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

function routePath(route: (typeof oregon04RouteDefinitions)[number]): string {
  return [
    cellKey(route.spawn.cell),
    ...route.redirects.map(({ cell }) => cellKey(cell)),
    cellKey(route.exit),
  ].join('|');
}

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Fort Echo TDM, Oregon draw layers, collision codes, and bundled atlas crops match the APK-derived map', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_27.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'a0cf3d00f3991a4deef4b00afd74aa5beb75601fb81dc1fbf7c742f897aff5dd');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'fort-echo');
  assert.equal(map.source.resource, 'res/raw/td_map_27.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [code, apkGrid.flat().filter((tile) => tile === code).length])), {
    0: 359, 16: 21, 32: 126, 36: 85, 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 48: 1,
    52: 12, 53: 13, 54: 26, 55: 2, 56: 2, 58: 1, 60: 3, 72: 1, 79: 10, 80: 4,
    88: 31, 96: 14, 98: 3, 99: 7, 100: 1, 101: 8, 104: 2, 107: 1, 113: 1,
    115: 6, 117: 2, 118: 3, 119: 6, 124: 6, 125: 4, 130: 1, 131: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 65);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))].sort().map((asset) => [
    asset,
    map.map.streets.filter((tile) => tile.asset === asset).length,
  ])), {
    miss_tiles_path: 11,
    miss_tiles_path_var: 11,
    tiles_bridge_hori: 4,
    tiles_bridge_pier_left: 4,
    tiles_bridge_pier_right: 4,
    tiles_bridge_verti: 31,
  });

  const scene = createOregon04MapScene();
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));

  for (const asset of new Set([...map.map.background, ...map.map.streets].map(({ asset }) => asset))) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} is bundled`);
    const { width, height } = pngDimensions(assetPath);
    const sourceScale = gameAssetSourceScale(asset);
    for (const tile of [...map.map.background, ...map.map.streets].filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= width / sourceScale, `${asset} source x-range is in atlas`);
      assert.ok(tile.source.y + tile.source.height <= height / sourceScale, `${asset} source y-range is in atlas`);
    }
  }
});

test('Fort Echo routes enumerate every APK direction branch from all five entrances', () => {
  const rowMajorSpawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(rowMajorSpawnCells, [[31, 4], [31, 8], [31, 12], [31, 16], [31, 20]]);
  assert.deepEqual(oregon04SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4 });

  const actualPaths = oregon04RouteDefinitions.map(routePath);
  assert.deepEqual(actualPaths, [
    '31,4|27,4|24,4|24,2|21,2|21,4|19,4|19,6|14,6|14,8|10,8|10,3|9,3|2,3|2,6|4,6|4,12|0,12',
    '31,4|27,4|27,7|23,7|23,9|19,9|19,6|14,6|14,8|10,8|10,3|9,3|2,3|2,6|4,6|4,12|0,12',
    '31,8|25,8|24,8|24,9|23,9|19,9|19,6|14,6|14,8|10,8|10,3|9,3|2,3|2,6|4,6|4,12|0,12',
    '31,8|25,8|25,10|20,10|19,10|19,12|14,12|14,9|9,9|9,3|2,3|2,6|4,6|4,12|0,12',
    '31,8|25,8|25,10|20,10|20,12|19,12|14,12|14,9|9,9|9,3|2,3|2,6|4,6|4,12|0,12',
    '31,12|25,12|25,10|20,10|19,10|19,12|14,12|14,9|9,9|9,3|2,3|2,6|4,6|4,12|0,12',
    '31,12|25,12|25,10|20,10|20,12|19,12|14,12|14,9|9,9|9,3|2,3|2,6|4,6|4,12|0,12',
    '31,12|25,12|25,14|20,14|20,13|19,13|14,13|14,15|12,15|12,17|9,17|9,20|3,20|3,16|6,16|6,12|4,12|0,12',
    '31,12|25,12|25,14|20,14|19,14|19,13|14,13|14,15|12,15|12,17|9,17|9,20|3,20|3,16|6,16|6,12|4,12|0,12',
    '31,16|25,16|25,15|24,15|19,15|19,18|12,18|12,17|9,17|9,20|3,20|3,16|6,16|6,12|4,12|0,12',
    '31,20|27,20|27,17|24,17|24,15|19,15|19,18|12,18|12,17|9,17|9,20|3,20|3,16|6,16|6,12|4,12|0,12',
    '31,20|27,20|22,20|22,21|19,21|19,18|12,18|12,17|9,17|9,20|3,20|3,16|6,16|6,12|4,12|0,12',
  ]);
  assert.equal(oregon04RouteDefinitions.length, 12);
  assert.equal(new Set(oregon04RouteDefinitions.flatMap(({ redirects }) => redirects.map(({ cell }) => cellKey(cell)))).size, 59);

  const controlEdges = new Set<string>();
  const spawnLegs = new Set<string>();
  for (const route of oregon04RouteDefinitions) {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    for (const cell of cells) {
      assert.ok(cell.x >= 0 && cell.x < map.map.width && cell.y >= 0 && cell.y < map.map.height, `route cell ${cellKey(cell)} remains in bounds`);
    }
    let direction = route.spawn.direction;
    for (let index = 1; index < cells.length; index += 1) {
      const from = cells[index - 1]!;
      const to = cells[index]!;
      const edge = `${cellKey(from)}:${direction}->${cellKey(to)}`;
      if (index === 1) spawnLegs.add(edge);
      else controlEdges.add(edge);
      const redirect = route.redirects[index - 1];
      if (redirect) direction = redirect.directions[0]!;
    }
  }
  assert.equal(new Set(oregon04RouteDefinitions.map(({ spawn }) => cellKey(spawn.cell))).size, 5);
  assert.deepEqual(new Set(oregon04RouteDefinitions.map(({ exit }) => cellKey(exit))), new Set(['0,12']));
  assert.equal(spawnLegs.size, 5);
  assert.equal(controlEdges.size, 65);
});
