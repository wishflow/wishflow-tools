import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-17.json';
import { createMississippi17MapScene } from '../src/content/mississippi-17-scene';
import { mississippi17RouteDefinitions } from '../src/content/mississippi-17-routes';
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
  '9,0:south->9,2', '15,0:south->15,2', '9,2:east->15,2', '9,2:south->9,5',
  '15,2:south->15,3', '25,2:east->31,2', '0,3:east->2,3', '2,3:east->6,3',
  '2,3:south->2,7', '6,3:south->6,5', '15,3:east->21,3', '15,3:south->15,7',
  '21,3:south->21,6', '6,5:east->9,5', '9,5:east->11,5', '11,5:south->11,7',
  '21,6:east->25,6', '21,6:south->21,8', '25,6:north->25,2', '25,6:east->27,6',
  '27,6:south->27,10', '2,7:east->6,7', '6,7:north->6,5', '6,7:south->6,12',
  '11,7:east->15,7', '15,7:east->17,7', '17,7:south->17,8', '17,8:east->21,8',
  '17,8:south->17,12', '21,8:south->21,12', '9,10:east->11,10', '11,10:north->11,7',
  '25,10:east->27,10', '27,10:east->31,10', '6,12:east->9,12', '9,12:north->9,10',
  '9,12:south->9,14', '15,12:east->17,12', '17,12:east->21,12', '21,12:east->23,12',
  '23,12:east->25,12', '23,12:south->23,16', '25,12:north->25,10', '9,14:east->11,14',
  '11,14:east->15,14', '11,14:south->11,18', '15,14:north->15,12', '0,15:east->2,15',
  '2,15:north->2,7', '2,15:east->4,15', '4,15:east->6,15', '4,15:south->4,19',
  '6,15:north->6,12', '15,16:north->15,14', '15,16:east->18,16', '18,16:south->18,18',
  '23,16:east->26,16', '26,16:east->31,16', '26,16:south->26,20', '11,18:east->14,18',
  '14,18:east->15,18', '15,18:north->15,16', '18,18:east->20,18', '20,18:east->23,18',
  '23,18:north->23,16', '4,19:east->6,19', '6,19:south->6,21', '26,20:east->31,20',
  '6,21:east->14,21', '14,21:north->14,18', '14,21:east->20,21', '20,21:north->20,18',
  '6,23:north->6,21', '14,23:north->14,21',
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

test('Dead Rocks map20 matches the APK TDM and Mississippi render layers', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_20.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'c4eb52558c04ad79e83125a193ca8a695e15ce83b6c7efd7636a9d2d232e8f6d');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'dead-rocks');
  assert.equal(map.source.resource, 'res/raw/td_map_20.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 8);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length, 28);
  assert.equal(map.map.streets.filter(({ asset }) => asset.includes('bridge_pier')).length, 16);

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

test('Dead Rocks routes match all APK spawn, redirector, exit and directed edge markers', () => {
  const exitsBySpawn = new Map<string, Set<string>>();
  const redirects = new Set<string>();
  const edges = new Set<string>();

  for (const route of mississippi17RouteDefinitions) {
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
    '9,0': ['31,10', '31,16', '31,2', '31,20'],
    '15,0': ['31,10', '31,16', '31,2', '31,20'],
    '0,3': ['31,10', '31,16', '31,20'],
    '0,15': ['31,10', '31,16', '31,20'],
    '6,23': ['31,10', '31,16', '31,20'],
    '14,23': ['31,10', '31,16', '31,20'],
  });
  assert.deepEqual([...edges].sort(), expectedRouteEdges);
  assert.equal(exitsBySpawn.size, 6);
  assert.equal(redirects.size, 53);
  assert.equal(edges.size, 74);
  assert.equal(new Set(mississippi17RouteDefinitions.map(({ exit }) => cellKey(exit))).size, 4);
});

test('Dead Rocks scene places all APK static scenery markers at their TDM cells', () => {
  const scene = createMississippi17MapScene();
  const decorations = scene.decorations ?? [];
  const cellsForAsset = (asset: string) => decorations
    .filter((item) => item.asset === asset)
    .map(({ cell }) => [cell.x, cell.y]);
  const markerCells = (code: number) => map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
    value === code ? [[x, y]] : []
  )));

  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));
  for (const [code, asset] of [
    [68, 'e_1x1_cactus_a'], [69, 'e_1x1_rocks_a'], [71, 'e_1x1_tree'], [77, 'e_1x2_bones'],
  ] as const) {
    assert.deepEqual(cellsForAsset(asset), markerCells(code), `marker ${code} maps to ${asset}`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
  assert.deepEqual(cellsForAsset('e_1x1_cactus_a'), [[17, 22]]);
  assert.equal(markerCells(69).length, 16);
  assert.equal(markerCells(71).length, 5);
  assert.equal(markerCells(77).length, 8);
  assert.equal(markerCells(113).length, 0, 'Dead Rocks does not contain a Fort marker');
});
