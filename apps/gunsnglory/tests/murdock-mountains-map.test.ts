import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-06.json';
import { createMurdockMountainsMapScene } from '../src/content/murdock-mountains-scene';
import {
  murdockMountainsRouteDefinitions,
  murdockMountainsSpawnPoints,
} from '../src/content/murdock-mountains-routes';
import { createMurdockMountainsUnits } from '../src/content/murdock-mountains-units';
import type { Direction, WaveRouteDefinition } from '../src/game';
import {
  gameAssetLogicalSize,
  gameAssetRelativePath,
  gameAssetSourceScale,
} from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedFrequency: Readonly<Record<number, number>> = {
  0: 189, 16: 64, 32: 40, 36: 21, 40: 1, 41: 1, 48: 2,
  53: 9, 54: 4, 55: 3, 68: 3, 69: 2, 70: 2, 72: 1, 73: 3,
  74: 1, 75: 1, 76: 1, 77: 1, 80: 6, 88: 4, 90: 7, 91: 2,
  92: 3, 94: 1, 95: 1, 96: 3, 97: 4, 98: 2, 99: 5, 100: 1,
  101: 2, 112: 1, 113: 1, 114: 1, 116: 2, 124: 6, 125: 4,
  126: 1, 130: 1, 131: 1,
};

const expectedRoutes = [
  '16,4 15,4 14,4 13,4 12,4 11,4 11,5 11,6 10,6 9,6 8,6 8,7 8,8 8,9 8,10 8,11 8,12 8,13 9,13 10,13 11,13 11,14 11,15 11,16 11,17 11,18 11,19 11,20 10,20 9,20 9,21 9,22 9,23',
  '0,5 1,5 2,5 3,5 4,5 4,6 5,6 6,6 7,6 7,7 7,8 7,9 7,10 7,11 7,12 7,13 7,14 8,14 9,14 10,14 10,15 10,16 10,17 10,18 9,18 9,19 8,19 8,20 8,21 8,22 8,23',
].map((route) => route.split(' ').map((cell) => cell.split(',').map(Number) as [number, number]));

function expandRoute(route: WaveRouteDefinition): [number, number][] {
  const cells: [number, number][] = [[route.spawn.cell.x, route.spawn.cell.y]];
  let current = { ...route.spawn.cell };
  let direction = route.spawn.direction;
  const vector: Readonly<Record<Direction, readonly [number, number]>> = {
    east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1],
  };

  for (const target of [...route.redirects, { cell: route.exit, directions: [] }]) {
    const [dx, dy] = vector[direction];
    assert.ok(
      (current.x === target.cell.x || current.y === target.cell.y)
      && Math.sign(target.cell.x - current.x) === dx
      && Math.sign(target.cell.y - current.y) === dy,
      `route continues ${direction} from (${current.x}, ${current.y}) to (${target.cell.x}, ${target.cell.y})`,
    );
    while (current.x !== target.cell.x || current.y !== target.cell.y) {
      current = { x: current.x + dx, y: current.y + dy };
      cells.push([current.x, current.y]);
    }
    if (target.directions.length > 0) direction = target.directions[0]!;
  }
  return cells;
}

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

test('preserves the exact 17×24 Murdock Mountains APK grid and derived render layers', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_06.tdm'));
  assert.equal(map.id, 'murdock-mountains');
  assert.equal(map.source.resource, 'res/raw/td_map_06.tdm');
  assert.deepEqual([...bytes.subarray(0, 2)], [17, 24]);
  assert.equal(bytes.length, 2 + (17 * 24));
  assert.equal(map.map.width, 17);
  assert.equal(map.map.height, 24);
  assert.equal(map.map.tileSize, 32);
  assert.equal(map.originalTileGrid.length, 24);

  for (let y = 0; y < 24; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, 17, `row ${y} has 17 cells`);
    for (let x = 0; x < 17; x += 1) {
      assert.equal(bytes[2 + (y * 17) + x], map.originalTileGrid[y]?.[x], `TDM cell (${x}, ${y})`);
    }
  }

  const frequency = new Map<number, number>();
  for (const code of bytes.subarray(2)) frequency.set(code, (frequency.get(code) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries([...frequency].sort(([a], [b]) => a - b)), expectedFrequency);

  const expectedLayers = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expectedLayers.background);
  assert.deepEqual(map.map.streets, expectedLayers.streets);
  assert.equal(map.map.background.length, 17 * 24);
  assert.deepEqual({
    paths: map.map.streets.filter(({ asset }) => asset === 'tiles_path' || asset === 'tiles_path_var').length,
    horizontalBridges: map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length,
    verticalBridges: map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length,
    verticalRailTiles: map.map.streets.filter(({ asset }) => asset === 'tiles_railway_verti').length,
  }, { paths: 67, horizontalBridges: 6, verticalBridges: 4, verticalRailTiles: 12 });

  for (const asset of new Set([
    ...map.map.background.map(({ asset }) => asset),
    ...map.map.streets.map(({ asset }) => asset),
  ])) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `asset ${asset} exists`);
  }
});

test('places every original map decoration, hiring building, and unlocked unit at its TDM cell', () => {
  const scene = createMurdockMountainsMapScene();
  const expectedDecorationCodes: Readonly<Record<number, string>> = {
    68: 'e_1x1_cactus_a', 69: 'e_1x1_rocks_a', 70: 'e_1x1_rocks_b', 72: 'b_1x1_stake',
    73: 'e_1x1_cactus_b', 74: 'b_1x1_windmill', 75: 'b_1x1_watertower', 76: 'e_1x1_bush',
    77: 'e_1x2_bones', 94: 'tiles_railway_buffers_verti_up', 95: 'tiles_railway_buffers_verti_down',
    112: 'b_3x2_saloon', 113: 'b_3x2_fort', 114: 'b_2x1_tipi', 116: 'b_2x1_shack',
    126: 'e_1x1_rocks_water',
  };
  const expectedDecorations = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    expectedDecorationCodes[code] ? [{ asset: expectedDecorationCodes[code]!, cell: { x, y } }] : []
  )));
  assert.deepEqual(scene.decorations?.map(({ asset, cell }) => ({ asset, cell })), expectedDecorations);
  assert.equal(scene.decorations?.length, 23);
  assert.deepEqual(scene.decorations?.filter(({ asset }) => asset.startsWith('tiles_railway_buffers_'))
    .map(({ asset, cell }) => ({ asset, cell })), [
    { asset: 'tiles_railway_buffers_verti_up', cell: { x: 13, y: 10 } },
    { asset: 'tiles_railway_buffers_verti_down', cell: { x: 13, y: 23 } },
  ]);
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'b_3x2_fort'), {
    asset: 'b_3x2_fort',
    cell: { x: 1, y: 12 },
    anchorOffsetY: -0.3,
    collisionBoxFine: { x: -9408, y: -9600, width: 18048, height: 7680 },
  });

  const units = createMurdockMountainsUnits(() => true);
  const expectedUnits: Readonly<Record<number, { type: string; cells: [number, number][] }>> = {
    96: { type: 'gunslinger', cells: [[11, 7], [4, 10], [7, 17]] },
    97: { type: 'mexican', cells: [[14, 7], [3, 8], [5, 15], [6, 20]] },
    98: { type: 'cannon', cells: [[2, 10], [4, 12]] },
    99: { type: 'indian', cells: [[2, 1], [11, 1], [14, 1], [5, 3], [8, 4]] },
    100: { type: 'sniper', cells: [[2, 19]] },
    101: { type: 'grandpa', cells: [[1, 8], [15, 12]] },
    130: { type: 'pyromaniac', cells: [[16, 18]] },
    131: { type: 'salesman', cells: [[16, 20]] },
  };
  assert.equal(units.length, 19);
  for (const { type, cells } of Object.values(expectedUnits)) {
    assert.deepEqual(units.filter((unit) => unit.type === type).map(({ cell, activity }) => [cell.x, cell.y, activity]),
      cells.map(([x, y]) => [x, y, 4]));
  }
  assert.equal(createMurdockMountainsUnits((unitTypeId) => unitTypeId <= 4).length, 14);

  for (const asset of new Set([
    ...(scene.decorations ?? []).map(({ asset }) => asset),
    ...units.map(({ asset }) => asset),
  ])) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `asset ${asset} exists`);
  }
});

test('uses APK scan order and follows both complete enemy direction-field routes', () => {
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 40), [[0, 5]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 41), [[16, 4]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 48), [[8, 23], [9, 23]]);
  assert.deepEqual(murdockMountainsSpawnPoints, [
    { cell: { x: 16, y: 4 }, direction: 'west' },
    { cell: { x: 0, y: 5 }, direction: 'east' },
  ]);
  assert.equal(murdockMountainsRouteDefinitions.length, 2);

  const expandedRoutes = murdockMountainsRouteDefinitions.map(expandRoute);
  assert.deepEqual(expandedRoutes, expectedRoutes);
  assert.deepEqual(expandedRoutes.map((route) => route.length), [33, 31]);
  assert.equal(new Set(expandedRoutes.flat().map(([x, y]) => `${x},${y}`)).size, 64);
  assert.deepEqual(expandedRoutes.map((route) => route.filter(([x, y]) => map.originalTileGrid[y]?.[x] === 80)), [
    [[8, 8], [11, 16], [9, 22]],
    [[7, 8], [10, 16], [8, 22]],
  ]);
  assert.ok(expandedRoutes.flat().every(([x, y]) => !(x === 13 && y >= 11 && y <= 22)),
    'enemy direction fields do not treat the vertical railway as a route');
  for (const [index, route] of murdockMountainsRouteDefinitions.entries()) {
    assert.deepEqual(route.spawn, murdockMountainsSpawnPoints[index]);
    assert.deepEqual(route.exit, index === 0 ? { x: 9, y: 23 } : { x: 8, y: 23 });
    assert.ok(route.redirects.every(({ cell, directions }) => (
      directions.length === 1 && [53, 54, 55].includes(map.originalTileGrid[cell.y]?.[cell.x] ?? -1)
    )));
  }
});

test('loads the extracted vertical railway atlas and end buffers at the original HDPI scale', () => {
  assert.equal(gameAssetRelativePath('tiles_railway_verti'), 'hdpi/tiles_railway_verti.png');
  assert.equal(gameAssetSourceScale('tiles_railway_verti'), 1.5);
  for (const asset of ['tiles_railway_buffers_verti_up', 'tiles_railway_buffers_verti_down']) {
    assert.equal(gameAssetRelativePath(asset), `hdpi/${asset}.png`);
    assert.deepEqual(gameAssetLogicalSize(asset, { width: 48, height: 48 }), { width: 32, height: 32 });
  }
  for (const file of [
    'tiles_railway_verti.png',
    'tiles_railway_buffers_verti_up.png',
    'tiles_railway_buffers_verti_down.png',
  ]) {
    const assetPath = path.join(appRoot, 'public/assets/hdpi', file);
    assert.equal(existsSync(assetPath), true, `${file} was extracted from the APK`);
    const png = readFileSync(assetPath);
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.equal(png.readUInt32BE(16), 48, `${file} keeps the original 48px width`);
    assert.equal(png.readUInt32BE(20), 48, `${file} keeps the original 48px height`);
  }
});
