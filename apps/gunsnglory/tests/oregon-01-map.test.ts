import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/oregon-01.json';
import { createOregon01MapScene } from '../src/content/oregon-01-scene';
import { oregon01RouteDefinitions, oregon01SpawnPointIdByActionId } from '../src/content/oregon-01-routes';
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

test('Eastwood Forest TDM, Oregon draw layers, and collision terrain match the APK data', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_24.tdm'));
  assert.equal(bytes.length, 770);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'a03c976a5d7b3a97e5b418fd779a56ce62bf39fdc2c854fd607d33a1c4fbf100');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'eastwood-forest');
  assert.equal(map.source.resource, 'res/raw/td_map_24.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.equal(map.map.streets.length, 76);

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

  const scene = createOregon01MapScene();
  const collision = scene.backgroundCollisionCodes ?? [];
  assert.equal(collision.length, 24);
  assert.ok(collision.every((row) => row.length === 32 && row.every(Number.isInteger)));
  assert.deepEqual(collision, deriveOriginalBackgroundCodesForTest(map));
});

test('Eastwood Forest routes preserve all six APK spawn-to-exit paths and action IDs', () => {
  const rowMajorSpawnCells = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [[x, y]] : []
  )));
  const routeSpawnCells = [...new Map(oregon01RouteDefinitions.map(({ spawn }) => [
    cellKey(spawn.cell), [spawn.cell.x, spawn.cell.y],
  ])).values()];
  assert.deepEqual(routeSpawnCells, rowMajorSpawnCells);
  assert.deepEqual(routeSpawnCells, [[31, 3], [31, 12], [31, 19], [25, 23]]);
  assert.deepEqual(oregon01SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });

  const paths = oregon01RouteDefinitions.map((route) => ({
    spawn: cellKey(route.spawn.cell),
    redirects: route.redirects.map(({ cell }) => cellKey(cell)),
    exit: cellKey(route.exit),
  }));
  assert.deepEqual(paths, [
    {
      spawn: '31,3',
      redirects: ['28,3', '28,5', '23,5', '23,9', '17,9', '17,12', '12,12', '12,15', '7,15', '7,13', '5,13', '5,10', '2,10', '2,6', '5,6', '5,5', '12,5'],
      exit: '12,0',
    },
    {
      spawn: '31,3',
      redirects: ['28,3', '28,5', '23,5', '23,9', '17,9', '17,12', '12,12', '12,15', '7,15', '5,15', '5,13', '5,10', '2,10', '2,6', '5,6', '5,5', '12,5'],
      exit: '12,0',
    },
    {
      spawn: '31,12',
      redirects: ['27,12', '27,10', '18,10', '18,13', '13,13', '13,15', '12,15', '7,15', '7,13', '5,13', '5,10', '2,10', '2,6', '5,6', '5,5', '12,5'],
      exit: '12,0',
    },
    {
      spawn: '31,12',
      redirects: ['27,12', '27,10', '18,10', '18,13', '13,13', '13,15', '12,15', '7,15', '5,15', '5,13', '5,10', '2,10', '2,6', '5,6', '5,5', '12,5'],
      exit: '12,0',
    },
    {
      spawn: '31,19',
      redirects: ['28,19', '28,16', '21,16', '21,18', '13,18', '13,16', '12,16', '4,16', '4,11', '1,11', '1,5', '4,5', '4,4', '11,4'],
      exit: '11,0',
    },
    {
      spawn: '25,23',
      redirects: ['25,21', '21,21', '21,19', '12,19', '12,16', '4,16', '4,11', '1,11', '1,5', '4,5', '4,4', '11,4'],
      exit: '11,0',
    },
  ]);

  const redirectCells = new Set(paths.flatMap(({ redirects }) => redirects));
  const edges = new Set<string>();
  for (const route of oregon01RouteDefinitions) {
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const redirect of route.redirects) {
      edges.add(`${cellKey(current)}:${direction}->${cellKey(redirect.cell)}`);
      current = redirect.cell;
      direction = redirect.directions[0]!;
    }
    edges.add(`${cellKey(current)}:${direction}->${cellKey(route.exit)}`);
  }
  assert.equal(redirectCells.size, 42);
  assert.equal(oregon01RouteDefinitions.length, 6);
  assert.equal(edges.size, 47);
  assert.deepEqual([...new Set(oregon01RouteDefinitions.map(({ exit }) => cellKey(exit)))].sort(), ['11,0', '12,0']);
});
