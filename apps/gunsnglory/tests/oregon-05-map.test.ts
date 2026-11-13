import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-05.json';
import { createOregon05MapScene } from '../src/content/oregon-05-scene';
import { oregon05RouteDefinitions, oregon05SpawnPointIdByActionId } from '../src/content/oregon-05-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import type { Direction } from '../src/game';
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

test('Dynamite Plains TDM, Oregon draw layers, collision codes, and atlas crops match APK-derived data', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_28.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'dbb0fe70d14ba923df45842df6709b287a2bbeaabde1025c704455b1fd4720c7');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'dynamite-plains');
  assert.equal(map.source.resource, 'res/raw/td_map_28.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [code, apkGrid.flat().filter((tile) => tile === code).length])), {
    0: 371, 16: 41, 32: 102, 36: 51, 40: 1, 41: 1, 42: 1, 43: 1, 48: 2,
    52: 11, 53: 6, 54: 7, 55: 11, 56: 1, 57: 1, 68: 1, 72: 1, 74: 1, 77: 1,
    78: 24, 79: 8, 80: 8, 88: 9, 96: 6, 97: 5, 98: 3, 99: 7, 100: 1, 101: 5,
    102: 3, 104: 1, 110: 3, 112: 1, 114: 1, 115: 5, 117: 3, 118: 9, 119: 6,
    124: 36, 125: 9, 130: 2, 131: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 76);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))].sort().map((asset) => [
    asset,
    map.map.streets.filter((tile) => tile.asset === asset).length,
  ])), {
    miss_tiles_path: 25,
    miss_tiles_path_var: 18,
    tiles_bridge_hori: 8,
    tiles_bridge_pier_left: 8,
    tiles_bridge_pier_right: 8,
    tiles_bridge_verti: 9,
  });

  const scene = createOregon05MapScene();
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

test('Dynamite Plains routes cover all APK direction edges from all four entrances', () => {
  const spawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(spawnCells, [[5, 23], [11, 23], [14, 23], [20, 23]]);
  assert.deepEqual(oregon05SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });

  const expectedEdges = new Set([
    '8,4:south->8,5', '12,4:west->8,4', '18,4:east->22,4', '22,4:south->22,5',
    '5,5:south->5,7', '8,5:west->5,5', '22,5:east->25,5', '25,5:south->25,7',
    '5,7:south->5,13', '8,7:west->5,7', '22,7:east->25,7', '25,7:south->25,13',
    '12,8:north->12,4', '13,8:west->12,8', '17,8:east->18,8', '18,8:north->18,4',
    '8,9:north->8,7', '13,9:north->13,8', '13,9:west->8,9', '17,9:north->17,8',
    '17,9:east->22,9', '22,9:north->22,7', '5,13:west->0,13', '25,13:east->31,13',
    '10,15:east->13,15', '13,15:north->13,9', '11,16:east->13,16', '13,16:north->13,15',
    '15,16:east->17,16', '17,16:north->17,9', '19,16:west->17,16', '6,17:east->10,17',
    '10,17:north->10,15', '5,19:east->6,19', '6,19:north->6,17', '19,20:north->19,16',
    '20,20:west->19,20', '14,21:east->15,21', '15,21:north->15,16',
    '5,23:north->5,19', '11,23:north->11,16', '14,23:north->14,21', '20,23:north->20,20',
  ]);

  const actualEdges = new Set<string>();
  const redirectors = new Set<string>();
  for (const route of oregon05RouteDefinitions) {
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
    assert.ok(['0,13', '31,13'].includes(cellKey(route.exit)));
  }
  assert.equal(oregon05RouteDefinitions.length > 0, true);
  assert.deepEqual(actualEdges, expectedEdges);
  assert.equal(actualEdges.size, 43);
  assert.equal(redirectors.size, 37);
  assert.deepEqual(new Set(oregon05RouteDefinitions.map(({ spawn }) => cellKey(spawn.cell))), new Set(['5,23', '11,23', '14,23', '20,23']));
  assert.deepEqual(new Set(oregon05RouteDefinitions.map(({ exit }) => cellKey(exit))), new Set(['0,13', '31,13']));
});
