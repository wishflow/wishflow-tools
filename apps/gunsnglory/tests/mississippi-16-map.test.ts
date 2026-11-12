import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-16.json';
import { createMississippi16MapScene } from '../src/content/mississippi-16-scene';
import { mississippi16RouteDefinitions } from '../src/content/mississippi-16-routes';
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

test('Highpoint Terrace map19 matches the APK grid and Mississippi terrain layers', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_19.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'highpoint-terrace');
  assert.equal(map.source.resource, 'res/raw/td_map_19.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);

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

test('Highpoint Terrace route paths cover every APK spawn, redirector, exit, and reachable branch', () => {
  const exitsBySpawn = new Map<string, Set<string>>();
  const redirects = new Set<string>();
  const edges = new Set<string>();

  for (const route of mississippi16RouteDefinitions) {
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
    '10,0': ['31,12', '31,9'],
    '11,0': ['31,12', '31,8', '31,9'],
    '0,2': ['31,12', '31,8', '31,9'],
    '0,9': ['31,12', '31,9'],
    '0,12': ['31,13'],
    '0,19': ['31,13', '31,8'],
  });
  assert.deepEqual([...edges].sort(), [
    '10,0:south->10,6', '11,0:south->11,2', '0,2:east->2,2', '2,2:east->11,2',
    '2,2:south->2,8', '11,2:east->20,2', '20,2:east->21,2', '20,2:south->20,6',
    '21,2:east->29,2', '21,2:south->21,9', '29,2:south->29,8', '10,6:east->20,6',
    '20,6:south->20,10', '2,8:east->6,8', '6,8:south->6,9', '25,8:east->29,8',
    '29,8:east->31,8', '0,9:east->4,9', '4,9:south->4,10', '6,9:east->10,9',
    '10,9:south->10,10', '21,9:east->25,9', '25,9:north->25,8', '26,9:east->31,9',
    '4,10:east->10,10', '10,10:east->20,10', '20,10:east->26,10', '26,10:north->26,9',
    '26,10:south->26,11', '5,11:east->10,11', '10,11:east->20,11', '20,11:east->25,11',
    '25,11:south->25,13', '26,11:south->26,12', '0,12:east->5,12', '5,12:north->5,11',
    '6,12:east->11,12', '11,12:south->11,15', '26,12:east->31,12', '2,13:east->6,13',
    '6,13:north->6,12', '25,13:east->29,13', '29,13:east->31,13', '10,15:north->10,11',
    '10,15:east->11,15', '11,15:east->21,15', '21,15:north->21,9', '21,15:south->21,19',
    '0,19:east->2,19', '2,19:north->2,13', '2,19:east->10,19', '10,19:north->10,15',
    '10,19:east->20,19', '20,19:north->20,11', '20,19:east->21,19', '21,19:east->29,19',
    '29,19:north->29,13',
  ].sort());
  assert.equal(exitsBySpawn.size, 6);
  assert.equal(redirects.size, 42);
  assert.equal(edges.size, 57);
  assert.equal(new Set(mississippi16RouteDefinitions.map(({ exit }) => cellKey(exit))).size, 4);
});

test('Highpoint Terrace scene renders all supported marker decorations and four Forts', () => {
  const scene = createMississippi16MapScene();
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
    [70, 'e_1x1_rocks_b'], [71, 'e_1x1_tree'], [76, 'e_1x1_bush'], [113, 'b_3x2_fort'],
  ] as const) {
    assert.deepEqual(cellsForAsset(asset), markerCells(code), `marker ${code} maps to ${asset}`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
  assert.deepEqual(cellsForAsset('b_3x2_fort'), [[5, 5], [26, 5], [5, 16], [26, 16]]);
  assert.equal(markerCells(78).length, 5);
  assert.deepEqual(markerCells(102), [[28, 10]]);
  assert.deepEqual(markerCells(110), [[27, 11]]);
});
