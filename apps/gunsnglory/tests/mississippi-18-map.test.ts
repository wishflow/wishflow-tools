import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-18.json';
import { createMississippi18MapScene } from '../src/content/mississippi-18-scene';
import { mississippi18RouteDefinitions, mississippi18SpawnPointIdByActionId } from '../src/content/mississippi-18-routes';
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
  '0,10:east->4,10', '0,15:east->3,15', '0,16:east->2,16', '0,9:east->3,9',
  '10,20:south->10,21', '10,21:east->21,21', '10,4:east->17,4', '10,6:north->10,4',
  '11,19:south->11,20', '11,20:east->22,20', '12,18:south->12,19', '12,19:east->20,19',
  '17,4:south->17,5', '17,5:east->23,5', '18,3:south->18,4', '18,4:east->25,4',
  '19,2:south->19,3', '19,3:east->24,3', '2,16:south->2,17', '2,17:east->7,17',
  '2,18:east->6,18', '2,23:north->2,18', '20,18:east->26,18', '20,19:east->21,19',
  '20,19:north->20,18', '21,19:south->21,21', '21,21:south->21,23', '22,20:east->24,20',
  '22,20:south->22,23', '23,5:east->24,5', '23,5:south->23,6', '23,6:east->27,6',
  '24,19:east->27,19', '24,20:north->24,19', '24,3:north->24,0', '24,5:east->28,5',
  '24,5:north->24,3', '25,4:east->29,4', '25,4:north->25,0', '26,14:east->28,14',
  '26,18:north->26,14', '27,11:east->29,11', '27,15:east->29,15', '27,19:north->27,15',
  '27,6:south->27,11', '28,12:east->31,12', '28,14:north->28,12', '28,5:south->28,12',
  '29,11:east->31,11', '29,15:north->29,11', '29,4:south->29,11', '3,0:south->3,4',
  '3,15:north->3,9', '3,15:south->3,16', '3,16:east->4,16', '3,4:east->8,4',
  '3,5:east->9,5', '3,9:north->3,5', '4,10:north->4,6', '4,10:south->4,16',
  '4,16:east->8,16', '4,6:east->10,6', '6,18:south->6,20', '6,20:east->10,20',
  '7,17:south->7,19', '7,19:east->11,19', '8,16:south->8,18', '8,18:east->12,18',
  '8,2:east->19,2', '8,4:north->8,2', '9,3:east->18,3', '9,5:north->9,3',
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

test('Shadow Town TDM and rendered Mississippi layers match their APK-derived source', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_21.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '8f1609f3ef8f5a46b77f240c35ed775b0c5623bcbbcfebde8018e42fe43d7a99');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'shadow-town');
  assert.equal(map.source.resource, 'res/raw/td_map_21.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 10);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length, 8);
  assert.equal(map.map.streets.filter(({ asset }) => asset.includes('bridge_pier')).length, 10);

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

test('Shadow Town paths cover every APK spawn, redirector, exit, and directed edge', () => {
  const exitsBySpawn = new Map<string, Set<string>>();
  const redirects = new Set<string>();
  const edges = new Set<string>();

  for (const route of mississippi18RouteDefinitions) {
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
    '3,0': ['24,0'],
    '0,9': ['25,0', '31,11'],
    '0,10': ['21,23', '24,0', '31,11', '31,12'],
    '0,15': ['21,23', '25,0', '31,11', '31,12'],
    '0,16': ['22,23', '31,11'],
    '2,23': ['21,23'],
  });
  assert.deepEqual([...edges].sort(), expectedRouteEdges);
  assert.equal(exitsBySpawn.size, 6);
  assert.equal(redirects.size, 59);
  assert.equal(edges.size, 72);
  assert.equal(new Set(mississippi18RouteDefinitions.map(({ exit }) => cellKey(exit))).size, 6);
});

test('Shadow Town converts APK action IDs to row-major campaign spawn indices', () => {
  assert.deepEqual(mississippi18SpawnPointIdByActionId, { 4: 0, 0: 1, 1: 2, 2: 3, 3: 4, 5: 5 });
  const rowMajorSpawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  const routeSpawnCells = [...new Map(mississippi18RouteDefinitions.map(({ spawn }) => [
    cellKey(spawn.cell), [spawn.cell.x, spawn.cell.y],
  ])).values()];
  assert.deepEqual(routeSpawnCells, rowMajorSpawnCells);
});

test('Shadow Town scene keeps its collision grid aligned with the 32 by 24 map', () => {
  const scene = createMississippi18MapScene();
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));
  assert.equal(scene.background.length, 32 * 24);
  assert.equal(scene.streets.length, 73);
});
