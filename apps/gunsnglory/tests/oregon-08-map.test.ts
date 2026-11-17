import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Direction } from '../src/game';
import map from '../src/content/oregon-08.json';
import { createOregon08MapScene } from '../src/content/oregon-08-scene';
import { oregon08RouteDefinitions, oregon08SpawnPointIdByActionId } from '../src/content/oregon-08-routes';
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

test('Colt City TDM bytes, Oregon draw layers, collision grid, and atlas crops match the audited source', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_31.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'e1c9b8b64e8d4938aa337d59bd6f457546128bc978881dba44b14f719f34768f');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'colt-city');
  assert.equal(map.source.resource, 'res/raw/td_map_31.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 399, 16: 81, 32: 93, 36: 50, 40: 1, 41: 1, 42: 1, 43: 1,
    48: 2, 52: 6, 53: 10, 54: 13, 55: 1, 56: 1, 59: 1, 60: 3,
    70: 4, 72: 1, 79: 9, 80: 5, 81: 1, 82: 4, 83: 2, 84: 2,
    86: 1, 87: 1, 88: 14, 96: 13, 98: 3, 99: 6, 100: 1, 101: 2,
    112: 2, 113: 1, 114: 1, 115: 12, 116: 5, 117: 1, 118: 5, 119: 4,
    130: 1, 131: 1, 132: 1, 150: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 124);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))].sort().map((asset) => [
    asset,
    map.map.streets.filter((tile) => tile.asset === asset).length,
  ])), {
    miss_tiles_path: 37,
    miss_tiles_path_var: 49,
    tiles_bridge_hori: 5,
    tiles_bridge_pier_left: 5,
    tiles_bridge_pier_right: 5,
    tiles_bridge_verti: 14,
    tiles_railway_hori: 9,
  });

  const scene = createOregon08MapScene();
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

test('Colt City routes cover every audited edge from all four entrances', () => {
  const spawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(spawnCells, [[18, 0], [31, 8], [31, 19], [25, 23]]);
  assert.deepEqual(oregon08SpawnPointIdByActionId, { 0: 3, 1: 2, 2: 1, 3: 0 });

  const expectedEdges = new Set([
    '18,0:south->18,7', '13,7:south->13,15', '18,7:west->13,7', '18,7:east->20,7',
    '20,7:south->20,10', '23,8:south->23,10', '31,8:west->23,8', '20,10:east->21,10',
    '21,10:south->21,16', '22,10:south->22,12', '23,10:west->22,10', '23,10:south->23,12',
    '2,11:west->0,11', '22,12:south->22,16', '23,12:west->22,12', '2,13:north->2,11',
    '4,13:west->2,13', '4,15:north->4,13', '13,15:west->4,15', '6,16:south->6,21',
    '12,16:west->6,16', '13,16:north->13,15', '13,16:west->12,16', '20,16:south->20,17',
    '21,16:west->20,16', '22,16:west->21,16', '22,16:south->22,17', '20,17:south->20,20',
    '21,17:west->20,17', '21,17:south->21,18', '22,17:west->21,17', '25,17:west->22,17',
    '21,18:south->21,21', '24,18:west->21,18', '25,19:north->25,17', '31,19:west->25,19',
    '13,20:north->13,16', '20,20:west->13,20', '24,20:north->24,18', '25,20:west->24,20',
    '25,23:north->25,20', '12,21:north->12,16', '21,21:west->12,21', '6,21:west->0,21',
  ]);

  const actualEdges = new Set<string>();
  const redirectors = new Set<string>();
  for (const route of oregon08RouteDefinitions) {
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
    assert.ok(['0,11', '0,21'].includes(cellKey(route.exit)));
  }

  assert.deepEqual(actualEdges, expectedEdges);
  assert.equal(actualEdges.size, 44);
  assert.equal(redirectors.size, 35);
  assert.deepEqual(new Set(oregon08RouteDefinitions.map(({ spawn }) => cellKey(spawn.cell))), new Set(['18,0', '31,8', '31,19', '25,23']));
  assert.deepEqual(new Set(oregon08RouteDefinitions.map(({ exit }) => cellKey(exit))), new Set(['0,11', '0,21']));
});
