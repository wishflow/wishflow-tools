import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Direction } from '../src/game';
import map from '../src/content/oregon-07.json';
import { createOregon07MapScene } from '../src/content/oregon-07-scene';
import { oregon07RouteDefinitions, oregon07SpawnPointIdByActionId } from '../src/content/oregon-07-routes';
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

test('Mount Hood TDM bytes, Oregon draw layers, collision grid, and atlas crops match APK-derived data', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_30.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '9eace231a2cd51ab0fafe1e5360d799a533f64cb6e5819ac2323d0efacc6b3e4');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'mount-hood');
  assert.equal(map.source.resource, 'res/raw/td_map_30.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 380, 32: 121, 36: 56, 40: 1, 41: 1, 42: 1, 43: 1, 48: 3,
    52: 6, 53: 8, 54: 16, 56: 1, 74: 1, 75: 2, 77: 1, 78: 3,
    79: 15, 80: 1, 81: 1, 82: 29, 83: 4, 84: 6, 86: 2, 87: 2,
    88: 4, 96: 14, 97: 13, 98: 6, 99: 6, 100: 1, 101: 5, 102: 2,
    110: 2, 115: 8, 118: 7, 119: 7, 124: 15, 125: 13, 126: 1, 130: 1, 131: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 49);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))].sort().map((asset) => [
    asset,
    map.map.streets.filter((tile) => tile.asset === asset).length,
  ])), {
    tiles_bridge_hori: 1,
    tiles_bridge_pier_left: 2,
    tiles_bridge_pier_right: 2,
    tiles_bridge_verti: 4,
    tiles_railway_hori: 40,
  });

  const scene = createOregon07MapScene();
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

test('Mount Hood routes cover every APK direction edge from all four entrances', () => {
  const spawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(spawnCells, [[31, 2], [31, 10], [31, 11], [25, 23]]);
  assert.deepEqual(oregon07SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });

  const expectedEdges = new Set([
    '31,2:west->27,2', '27,2:south->27,5', '27,5:west->13,5', '13,5:south->13,10',
    '13,10:west->8,10', '8,10:south->8,14', '8,14:west->4,14', '4,14:north->4,9',
    '4,9:west->0,9', '17,10:west->13,10', '31,10:west->24,10',
    '24,10:south->24,13', '24,13:west->17,13', '17,13:north->17,11',
    '17,11:north->17,10', '17,11:west->16,11', '16,11:west->9,11',
    '9,11:south->9,15', '9,15:west->3,15', '3,15:north->3,10', '3,10:west->0,10',
    '31,11:west->28,11', '28,11:south->28,14', '28,14:west->21,14',
    '21,14:west->16,14', '16,14:north->16,12', '16,12:west->13,12',
    '13,12:south->13,14', '13,14:west->10,14', '10,14:south->10,16',
    '10,16:west->2,16', '2,16:north->2,11', '2,11:west->0,11',
    '25,23:north->25,19', '25,19:west->21,19', '21,19:north->21,14',
  ]);

  const actualEdges = new Set<string>();
  const redirectors = new Set<string>();
  for (const route of oregon07RouteDefinitions) {
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
    assert.ok(['0,9', '0,10', '0,11'].includes(cellKey(route.exit)));
  }

  assert.deepEqual(actualEdges, expectedEdges);
  assert.equal(actualEdges.size, 36);
  assert.equal(redirectors.size, 31);
  assert.deepEqual(new Set(oregon07RouteDefinitions.map(({ spawn }) => cellKey(spawn.cell))), new Set(['31,2', '31,10', '31,11', '25,23']));
  assert.deepEqual(new Set(oregon07RouteDefinitions.map(({ exit }) => cellKey(exit))), new Set(['0,9', '0,10', '0,11']));
});
