import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Direction } from '../src/game';
import map from '../src/content/oregon-06.json';
import { createOregon06MapScene } from '../src/content/oregon-06-scene';
import { oregon06RouteDefinitions, oregon06SpawnPointIdByActionId } from '../src/content/oregon-06-routes';
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

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Columbia River TDM bytes, Oregon draw layers, collision grid, and atlas crops match APK-derived data', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_29.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '765a96e904c0beddc92c2048a98611f89c848af111656565f755143540116aad');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'columbia-river');
  assert.equal(map.source.resource, 'res/raw/td_map_29.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 345, 16: 61, 32: 96, 36: 65, 40: 1, 41: 1, 42: 1, 43: 1, 48: 2,
    52: 6, 53: 7, 54: 16, 55: 1, 58: 2, 60: 2, 70: 1, 74: 1, 77: 1, 79: 13,
    80: 6, 88: 16, 96: 14, 97: 11, 98: 4, 99: 5, 100: 1, 101: 3, 102: 2,
    104: 1, 105: 1, 107: 1, 110: 2, 112: 1, 113: 1, 114: 1, 115: 10, 117: 1,
    118: 5, 119: 5, 120: 1, 121: 1, 123: 1, 124: 40, 125: 8, 126: 1, 130: 1, 131: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 98);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))].sort().map((asset) => [
    asset,
    map.map.streets.filter((tile) => tile.asset === asset).length,
  ])), {
    miss_tiles_path: 35,
    miss_tiles_path_var: 29,
    tiles_bridge_hori: 6,
    tiles_bridge_pier_left: 6,
    tiles_bridge_pier_right: 6,
    tiles_bridge_verti: 16,
  });

  const scene = createOregon06MapScene();
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

test('Columbia River routes cover every APK direction edge from all four entrances', () => {
  const spawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(spawnCells, [[10, 0], [31, 3], [31, 13], [31, 18]]);
  assert.deepEqual(oregon06SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });

  const expectedEdges = new Set([
    '10,0:south->10,4', '31,3:west->27,3', '31,13:west->27,13', '31,18:west->29,18',
    '23,12:north->23,9', '27,13:north->27,12', '6,18:north->6,16', '23,18:north->23,16',
    '25,20:north->25,18', '12,21:north->12,19', '27,3:south->27,6', '14,4:south->14,9',
    '14,9:south->14,14', '12,14:south->12,18', '15,18:south->15,21', '29,18:south->29,20',
    '6,19:south->6,21', '20,4:west->14,4', '27,6:west->23,6', '20,9:west->18,9',
    '23,9:west->20,9', '27,12:west->23,12', '14,14:west->12,14', '18,14:west->14,14',
    '6,16:west->0,16', '23,16:west->18,16', '12,18:west->6,18', '18,18:west->15,18',
    '25,18:west->23,18', '12,19:west->6,19', '29,20:west->25,20', '6,21:west->0,21',
    '15,21:west->12,21', '10,4:east->14,4', '20,6:north->20,4', '20,6:south->20,9',
    '18,16:north->18,14', '18,16:south->18,18', '23,6:west->20,6', '23,6:south->23,9',
    '18,9:west->14,9', '18,9:south->18,14',
  ]);

  const actualEdges = new Set<string>();
  const redirectors = new Set<string>();
  for (const route of oregon06RouteDefinitions) {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    let direction: Direction = route.spawn.direction;
    for (let index = 1; index < cells.length; index += 1) {
      const from = cells[index - 1]!;
      const to = cells[index]!;
      assert.ok(from.x >= 0 && from.x < map.map.width && from.y >= 0 && from.y < map.map.height);
      assert.ok(to.x >= 0 && to.x < map.map.width && to.y >= 0 && to.y < map.map.height);
      actualEdges.add(`${cellKey(from)}:${direction}->${cellKey(to)}`);
      const redirect = route.redirects[index - 1];
      if (redirect) {
        redirectors.add(cellKey(redirect.cell));
        direction = redirect.directions[0]!;
      }
    }
    assert.ok(['0,16', '0,21'].includes(cellKey(route.exit)));
  }

  assert.deepEqual(actualEdges, expectedEdges);
  assert.equal(actualEdges.size, 42);
  assert.equal(redirectors.size, 34);
  assert.deepEqual(new Set(oregon06RouteDefinitions.map(({ spawn }) => cellKey(spawn.cell))), new Set(['10,0', '31,3', '31,13', '31,18']));
  assert.deepEqual(new Set(oregon06RouteDefinitions.map(({ exit }) => cellKey(exit))), new Set(['0,16', '0,21']));
});
