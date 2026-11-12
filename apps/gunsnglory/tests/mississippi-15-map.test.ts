import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-15.json';
import { createMississippi15MapScene } from '../src/content/mississippi-15-scene';
import { mississippi15RouteDefinitions } from '../src/content/mississippi-15-routes';
import { createMississippi15SteamerUnits } from '../src/content/mississippi-15-steamer';
import { createMississippi15TrainUnits } from '../src/content/mississippi-15-trains';
import { createMississippi15MapUnits } from '../src/content/mississippi-15-units';
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

test('Railroad Canyon map18 matches the APK grid and deterministic Mississippi terrain', () => {
  const tdmPath = path.join(appRoot, 'public/content/maps/td_map_18.tdm');
  const bytes = readFileSync(tdmPath);
  assert.equal(bytes.length, 770);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    'e7d6401689765628ea7c352610872f6d2679b16f280006ed113fd67b257903b8',
  );
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'railroad-canyon');
  assert.equal(map.source.resource, 'res/raw/td_map_18.tdm');
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

test('Railroad Canyon route definitions cover every reachable APK action and exit', () => {
  const exitsBySpawn = new Map<string, Set<string>>();
  const redirects = new Set<string>();
  const edges = new Set<string>();

  for (const route of mississippi15RouteDefinitions) {
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
    '17,0': ['31,15', '31,19', '31,8', '31,9'],
    '18,0': ['31,7'],
    '0,2': ['31,15', '31,19', '31,9'],
    '0,3': ['31,10', '31,15', '31,19'],
    '0,14': ['31,15', '31,19', '31,9'],
    '0,15': ['31,10', '31,15', '31,19'],
  });
  assert.equal(redirects.size, 33);
  assert.equal(edges.size, 46);
  assert.equal(new Set(mississippi15RouteDefinitions.map(({ exit }) => cellKey(exit))).size, 6);
});

test('Railroad Canyon scene renders all APK decoration and spawn-building markers', () => {
  const scene = createMississippi15MapScene();
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
    [68, 'e_1x1_cactus_a'], [69, 'e_1x1_rocks_a'], [71, 'e_1x1_tree'], [73, 'e_1x1_cactus_b'],
    [74, 'b_1x1_windmill'], [75, 'b_1x1_watertower'], [77, 'e_1x2_bones'],
    [86, 'tiles_railway_buffers_hori_left'], [87, 'tiles_railway_buffers_hori_right'],
    [94, 'tiles_railway_buffers_verti_up'], [95, 'tiles_railway_buffers_verti_down'],
    [112, 'b_3x2_saloon'], [126, 'e_1x1_rocks_water'],
  ] as const) {
    assert.deepEqual(cellsForAsset(asset), markerCells(code), `marker ${code} maps to ${asset}`);
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Railroad Canyon has two horizontal and one vertical hireable train groups', () => {
  const units = createMississippi15TrainUnits();
  const groups = new Map<string, typeof units>();
  for (const unit of units) {
    assert.ok(unit.movementGroupId);
    groups.set(unit.movementGroupId, [...(groups.get(unit.movementGroupId) ?? []), unit]);
  }
  assert.deepEqual([...groups.values()].map((group) => group.length).sort((left, right) => left - right), [3, 6, 6]);
  assert.equal(units.length, 15);
  assert.equal(new Set(units.map(({ id }) => id)).size, 15);
  assert.equal(units.filter(({ type, activity }) => type === 'train-12' && activity === 4).length, 5);
  assert.equal(units.filter(({ type, activity }) => type === 'train-22' && activity === 4).length, 4);
  assert.equal(units.filter(({ activity }) => activity === 5).length, 6);
  assert.deepEqual([...groups.values()].map((group) => group[0]!.movementAxis).sort(), ['horizontal', 'horizontal', 'vertical']);
});

test('Railroad Canyon Steamer and active map units follow fresh-game markers', () => {
  const steamers = createMississippi15SteamerUnits();
  assert.equal(steamers.length, 6);
  assert.equal(new Set(steamers.map(({ id }) => id)).size, 6);
  assert.equal(new Set(steamers.map(({ movementGroupId }) => movementGroupId)).size, 1);
  assert.deepEqual(steamers.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['steamer-30', 5, 19, 22], ['steamer-31', 5, 20, 22],
    ['steamer-32', 4, 21, 22], ['steamer-32', 4, 22, 22], ['steamer-32', 4, 23, 22],
    ['steamer-33', 5, 24, 22],
  ]);
  assert.ok(steamers.every(({ movementSurface }) => movementSurface === 'water'));

  assert.deepEqual(createMississippi15MapUnits().map(({ type, activity, cell, asset }) => [
    type, activity, cell.x, cell.y, asset,
  ]), [
    ['mexican', 5, 20, 5, 'player_mexican'],
    ['gunslinger', 5, 16, 6, 'player_gunslinger'],
    ['indian', 5, 17, 17, 'player_indian'],
  ]);
  assert.ok(createMississippi15MapUnits().every(({ activity }) => activity === 5));
});
