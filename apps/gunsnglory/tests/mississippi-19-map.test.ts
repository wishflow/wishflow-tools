import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-19.json';
import { createMississippi19MapScene } from '../src/content/mississippi-19-scene';
import { mississippi19RouteDefinitions, mississippi19SpawnPointIdByActionId } from '../src/content/mississippi-19-routes';
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

const expectedRouteEdges = [
  '1,0:south->1,3', '1,3:east->10,3', '1,3:south->1,7', '1,7:east->3,7',
  '10,12:west->9,12', '10,3:south->10,7', '10,7:west->9,7', '10,8:south->10,12',
  '11,2:south->11,8', '11,8:west->10,8', '2,0:south->2,2', '2,2:east->11,2',
  '20,2:south->20,8', '20,8:east->25,8', '21,3:south->21,7', '21,7:east->26,7',
  '22,12:south->22,17', '22,17:east->31,17', '23,13:south->23,16', '23,16:east->30,16',
  '25,12:west->22,12', '25,8:south->25,12', '26,10:east->30,10', '26,10:south->26,13',
  '26,13:west->23,13', '26,7:south->26,10', '29,0:south->29,2', '29,2:west->20,2',
  '3,11:east->8,11', '3,7:south->3,11', '30,0:south->30,3', '30,10:south->30,16',
  '30,16:east->31,16', '30,3:south->30,10', '30,3:west->21,3', '8,11:south->8,16',
  '8,16:west->0,16', '9,11:west->8,11', '9,12:south->9,17', '9,17:west->0,17',
  '9,7:south->9,11',
].sort();

function applyMississippiAtlases<T extends { asset: string }>(tiles: readonly T[]): T[] {
  return tiles.map((tile) => ({ ...tile, asset: regionAtlasAliases[tile.asset] ?? tile.asset }));
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Dust Falls TDM and rendered Mississippi layers match their APK-derived source', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_22.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '02da87e816398d6ec90883bc71943c4c4c045f765b016185e8c6635f40656a88');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'dust-falls');
  assert.equal(map.source.resource, 'res/raw/td_map_22.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 11);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length, 4);
  assert.equal(map.map.streets.filter(({ asset }) => asset.includes('bridge_pier')).length, 14);

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

test('Dust Falls paths cover every APK spawn, redirector, exit, and directed edge', () => {
  const exitsBySpawn = new Map<string, Set<string>>();
  const redirects = new Set<string>();
  const edges = new Set<string>();

  for (const route of mississippi19RouteDefinitions) {
    const spawnKey = cellKey(route.spawn.cell);
    const exits = exitsBySpawn.get(spawnKey) ?? new Set<string>();
    exits.add(cellKey(route.exit));
    exitsBySpawn.set(spawnKey, exits);

    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const redirect of route.redirects) {
      redirects.add(cellKey(redirect.cell));
      edges.add(`${cellKey(current)}:${direction}->${cellKey(redirect.cell)}`);
      assert.equal(redirect.directions.length, 1);
      current = redirect.cell;
      direction = redirect.directions[0]!;
    }
    edges.add(`${cellKey(current)}:${direction}->${cellKey(route.exit)}`);
  }

  assert.deepEqual(Object.fromEntries([...exitsBySpawn].map(([spawn, exits]) => [spawn, [...exits].sort()])), {
    '1,0': ['0,16'],
    '2,0': ['0,17'],
    '29,0': ['31,17'],
    '30,0': ['31,16'],
  });
  assert.deepEqual([...edges].sort(), expectedRouteEdges);
  assert.equal(mississippi19RouteDefinitions.length, 7);
  assert.equal(exitsBySpawn.size, 4);
  assert.equal(redirects.size, 34);
  assert.equal(edges.size, 41);
  const exits = new Set(mississippi19RouteDefinitions.map(({ exit }) => cellKey(exit)));
  assert.equal(exits.size, 4);
  assert.equal(exitsBySpawn.size + redirects.size + exits.size, 42);
});

test('Dust Falls converts APK action IDs to row-major campaign spawn indices', () => {
  assert.deepEqual(mississippi19SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });
  const rowMajorSpawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  const routeSpawnCells = [...new Map(mississippi19RouteDefinitions.map(({ spawn }) => [
    cellKey(spawn.cell), [spawn.cell.x, spawn.cell.y],
  ])).values()];
  assert.deepEqual(routeSpawnCells, rowMajorSpawnCells);
});

test('Dust Falls scene keeps its collision grid aligned with the 32 by 24 map', () => {
  const scene = createMississippi19MapScene();
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));
  assert.equal(scene.background.length, 32 * 24);
  assert.equal(scene.streets.length, map.map.streets.length);
});
