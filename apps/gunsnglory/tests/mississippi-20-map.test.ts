import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-20.json';
import { createMississippi20MapScene } from '../src/content/mississippi-20-scene';
import { mississippi20RouteDefinitions, mississippi20SpawnPointIdByActionId } from '../src/content/mississippi-20-routes';
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

test('Horse Hills TDM and rendered Mississippi layers match the APK-derived map', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_23.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '4c8fb4fa0481fb3a7e3a848d756c4042e2f3648f5722176b360a5575228aa302');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'horse-hills');
  assert.equal(map.source.resource, 'res/raw/td_map_23.tdm');
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

test('Horse Hills routes preserve every APK control path and action ID', () => {
  const rowMajorSpawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  const routeSpawnCells = [...new Map(mississippi20RouteDefinitions.map(({ spawn }) => [
    cellKey(spawn.cell), [spawn.cell.x, spawn.cell.y],
  ])).values()];
  assert.deepEqual(routeSpawnCells, rowMajorSpawnCells);
  assert.deepEqual(routeSpawnCells, [[0, 7], [0, 8]]);
  assert.deepEqual(mississippi20SpawnPointIdByActionId, { 0: 0, 1: 1 });

  const paths = mississippi20RouteDefinitions.map((route) => ({
    spawn: cellKey(route.spawn.cell),
    redirects: route.redirects.map(({ cell }) => cellKey(cell)),
    exit: cellKey(route.exit),
  }));
  assert.deepEqual(paths, [
    {
      spawn: '0,7',
      redirects: [
        '6,7', '6,9', '13,9', '13,7', '26,7', '26,9', '30,9', '30,15', '20,15', '20,13',
        '17,13', '17,15', '15,15', '2,15', '2,19', '8,19', '8,21', '13,21', '13,19', '15,19',
        '23,19', '23,21', '29,21',
      ],
      exit: '29,23',
    },
    {
      spawn: '0,7',
      redirects: [
        '6,7', '6,9', '13,9', '13,7', '26,7', '26,9', '30,9', '30,15', '20,15', '20,13',
        '17,13', '17,15', '15,15', '15,19', '23,19', '23,21', '29,21',
      ],
      exit: '29,23',
    },
    {
      spawn: '0,8',
      redirects: [
        '5,8', '5,10', '12,10', '14,10', '14,8', '25,8', '25,10', '29,10', '29,14', '21,14',
        '21,12', '16,12', '16,14', '12,14', '1,14', '1,20', '7,20', '7,22', '14,22', '14,20',
        '22,20', '22,22', '28,22',
      ],
      exit: '28,23',
    },
    {
      spawn: '0,8',
      redirects: [
        '5,8', '5,10', '12,10', '12,14', '1,14', '1,20', '7,20', '7,22', '14,22', '14,20',
        '22,20', '22,22', '28,22',
      ],
      exit: '28,23',
    },
  ]);

  const redirectCells = new Set(paths.flatMap(({ redirects }) => redirects));
  const edges = new Set<string>();
  for (const route of mississippi20RouteDefinitions) {
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const redirect of route.redirects) {
      edges.add(`${cellKey(current)}:${direction}->${cellKey(redirect.cell)}`);
      current = redirect.cell;
      direction = redirect.directions[0]!;
    }
    edges.add(`${cellKey(current)}:${direction}->${cellKey(route.exit)}`);
  }
  assert.equal(redirectCells.size, 46);
  assert.equal(mississippi20RouteDefinitions.length, 4);
  assert.equal(edges.size, 50);
  assert.deepEqual([...new Set(mississippi20RouteDefinitions.map(({ exit }) => cellKey(exit)))].sort(), ['28,23', '29,23']);
});

test('Horse Hills scene keeps terrain collision and map layers aligned', () => {
  const scene = createMississippi20MapScene();
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));
  assert.equal(scene.background.length, 32 * 24);
  assert.equal(scene.streets.length, map.map.streets.length);
});
