import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Direction, PreviewWaveDefinition } from '../src/game';
import map from '../src/content/oregon-09.json';
import { createOregon09MapScene } from '../src/content/oregon-09-scene';
import { oregon09RouteDefinitions, oregon09SpawnPointIdByActionId } from '../src/content/oregon-09-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
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

test('Snake River TDM, Oregon draw layers, and shaped background match the static APK reference', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_32.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'snake-river');
  assert.equal(map.source.resource, 'res/raw/td_map_32.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 309, 32: 208, 36: 63, 40: 1, 41: 1, 42: 1, 48: 2, 52: 7, 53: 9, 54: 4, 55: 12,
    69: 2, 70: 2, 78: 8, 79: 6, 80: 5, 88: 6, 100: 1, 101: 19, 102: 11, 110: 11,
    115: 13, 116: 5, 118: 3, 119: 8, 120: 1, 121: 1, 123: 1, 124: 44,
    126: 2, 130: 1, 131: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);

  const scene = createOregon09MapScene();
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));
  assert.equal(scene.backgroundCollisionCodes?.[15]?.[2], 14,
    'raw 36 starts at background code 0 but becomes blocking after adjacent-cell shaping');
  assert.equal(scene.backgroundCollisionCodes?.[13]?.[4], 67,
    'raw 80 bridge cells retain blocking background under a walkable street overlay');
  assert.equal(scene.backgroundCollisionCodes?.[10]?.[20], 23,
    'raw 88 bridge cells retain shaped background and rely on their street overlay for passage');

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

test('Snake River routes reproduce all 35 directed edges from every TDM entrance', () => {
  const spawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  assert.deepEqual(spawnCells, [[12, 0], [13, 0], [14, 0]]);
  assert.deepEqual(oregon09SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2 });

  const expectedEdges = new Set([
    '12,0:south->12,3', '13,0:south->13,4', '14,0:south->14,5',
    '3,3:south->3,20', '12,3:west->3,3', '4,4:south->4,19', '13,4:west->4,4',
    '5,5:south->5,18', '14,5:west->5,5', '16,8:east->29,8', '29,8:south->29,23',
    '8,11:east->16,11', '16,11:north->16,8', '19,11:east->22,11', '22,11:south->22,13',
    '25,11:east->28,11', '28,11:south->28,16', '9,12:east->19,12', '19,12:north->19,11',
    '10,13:east->16,13', '16,13:south->16,16', '22,13:east->25,13', '25,13:north->25,11',
    '13,16:south->13,19', '16,16:west->13,16', '23,16:east->28,16', '28,16:south->28,23',
    '5,18:east->8,18', '8,18:north->8,11', '4,19:east->9,19', '9,19:north->9,12',
    '13,19:east->23,19', '23,19:north->23,16', '3,20:east->10,20', '10,20:north->10,13',
  ]);

  const actualEdges = new Set<string>();
  const reachedRedirects = new Set<string>();
  const reachedExits = new Set<string>();
  for (const route of oregon09RouteDefinitions) {
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
        reachedRedirects.add(cellKey(redirect.cell));
        direction = redirect.directions[0]!;
      }
    }
    reachedExits.add(cellKey(route.exit));
  }

  assert.equal(expectedEdges.size, 35);
  assert.deepEqual(actualEdges, expectedEdges);
  assert.equal(reachedRedirects.size, 32);
  assert.deepEqual(reachedExits, new Set(['28,23', '29,23']));

  const firstRoute = oregon09RouteDefinitions[0]!;
  const preview: PreviewWaveDefinition = {
    number: 1,
    initialLives: 1,
    spawn: firstRoute.spawn,
    routes: oregon09RouteDefinitions,
    baseEnemySpeed: 1,
    speedMultiplierMin: 1,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: firstRoute.redirects,
    exit: firstRoute.exit,
  };
  const directionsByAction: readonly (readonly Direction[])[] = [
    ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
    ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
    ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
    ['south', 'north', 'west'],
  ];
  const expectedRuntimeRedirects = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    if (code < 52 || code > 65) return [];
    return [`${cellKey({ x, y })}:${directionsByAction[code - 52]!.join('/')}`];
  })).sort();
  const actualRuntimeRedirects = runtimeWaveRedirects(preview, map.originalTileGrid)
    .map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`).sort();
  assert.deepEqual(actualRuntimeRedirects, expectedRuntimeRedirects);
});
