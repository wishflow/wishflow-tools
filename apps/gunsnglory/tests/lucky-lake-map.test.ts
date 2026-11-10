import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-07.json';
import { createLuckyLakeMapScene } from '../src/content/lucky-lake-scene';
import {
  luckyLakeExits,
  luckyLakeRedirects,
  luckyLakeRouteDefinitions,
  luckyLakeSpawnPoints,
} from '../src/content/lucky-lake-routes';
import { createLuckyLakeUnits } from '../src/content/lucky-lake-units';
import { createRoutePriorityMap } from '../src/game/route-priority';
import type { Direction, ScenarioContent, WaveRouteDefinition, WaveSpawn } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedFrequency: Readonly<Record<number, number>> = {
  0: 297, 16: 81, 32: 120, 36: 62, 40: 1, 41: 1, 42: 1, 48: 2,
  52: 6, 53: 9, 54: 16, 55: 1, 58: 2, 68: 3, 69: 5, 70: 3,
  71: 2, 73: 3, 74: 1, 75: 1, 76: 7, 80: 3, 88: 13, 89: 6,
  90: 8, 91: 2, 92: 5, 94: 1, 95: 1, 96: 13, 97: 7, 98: 7,
  99: 7, 100: 1, 101: 3, 112: 1, 113: 1, 114: 1, 116: 2, 117: 2,
  124: 46, 125: 10, 126: 2, 130: 1, 131: 1,
};

const directionByCode: Readonly<Record<number, Direction>> = {
  52: 'north', 53: 'south', 54: 'west', 55: 'east',
};

const routeExpectations = [
  {
    pool: 0,
    branches: [],
    redirects: [[26, 4, 'south'], [26, 8, 'west'], [22, 8, 'north'], [22, 4, 'west'], [16, 4, 'north'],
      [16, 1, 'west'], [10, 1, 'south'], [10, 4, 'west'], [6, 4, 'south'], [6, 5, 'west'],
      [2, 5, 'south'], [2, 10, 'east'], [5, 10, 'south'], [5, 14, 'west']],
    exit: [0, 14],
    length: 62,
    crossings: [[26, 6, 80], [19, 4, 88], [7, 4, 89], [2, 7, 80], [2, 14, 88]],
  },
  {
    pool: 1,
    branches: [[23, 13, 'north']],
    redirects: [[23, 9, 'west'], [21, 9, 'north'], [21, 5, 'west'], [15, 5, 'north'], [15, 2, 'west'],
      [11, 2, 'south'], [11, 5, 'west'], [6, 5, 'west'], [2, 5, 'south'], [2, 10, 'east'],
      [5, 10, 'south'], [5, 14, 'west']],
    exit: [0, 14],
    length: 61,
    crossings: [[25, 13, 88], [19, 5, 88], [7, 5, 89], [2, 7, 80], [2, 14, 88]],
  },
  {
    pool: 1,
    branches: [[23, 13, 'south'], [5, 18, 'north']],
    redirects: [[23, 20, 'west'], [15, 20, 'north'], [15, 18, 'west'], [5, 18, 'north'], [5, 14, 'west']],
    exit: [0, 14],
    length: 45,
    crossings: [[25, 13, 88], [23, 15, 80], [20, 20, 88], [11, 18, 88], [7, 18, 89], [2, 14, 88]],
  },
  {
    pool: 1,
    branches: [[23, 13, 'south'], [5, 18, 'south']],
    redirects: [[23, 20, 'west'], [15, 20, 'north'], [15, 18, 'west'], [5, 18, 'south'], [5, 19, 'west'], [2, 19, 'south']],
    exit: [2, 23],
    length: 44,
    crossings: [[25, 13, 88], [23, 15, 80], [20, 20, 88], [11, 18, 88], [7, 18, 89]],
  },
  {
    pool: 2,
    branches: [],
    redirects: [[27, 14, 'south'], [27, 18, 'west'], [24, 18, 'south'], [24, 21, 'west'],
      [14, 21, 'north'], [14, 19, 'west'], [2, 19, 'south']],
    exit: [2, 23],
    length: 43,
    crossings: [[20, 21, 88], [11, 19, 88], [7, 19, 89]],
  },
] as const;

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

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

function traceOriginalRoute(
  spawn: { cell: { x: number; y: number }; direction: Direction },
  branchDirections: readonly (readonly [x: number, y: number, direction: Direction])[],
): { cells: [number, number][]; redirects: [number, number, Direction][]; exit: [number, number] } {
  const cells: [number, number][] = [[spawn.cell.x, spawn.cell.y]];
  const redirects: [number, number, Direction][] = [];
  const branches = new Map(branchDirections.map(([x, y, direction]) => [`${x},${y}`, direction]));
  const visited = new Set<string>();
  let current = { ...spawn.cell };
  let direction = spawn.direction;

  for (let step = 0; step < map.map.width * map.map.height; step += 1) {
    const key = `${current.x},${current.y}`;
    assert.equal(visited.has(key), false, `APK route does not loop at ${key}`);
    visited.add(key);
    const code = map.originalTileGrid[current.y]?.[current.x];
    assert.notEqual(code, undefined, `APK route stays within map at ${key}`);
    if (code === 48) return { cells, redirects, exit: [current.x, current.y] };

    const fixedDirection = directionByCode[code!];
    if (fixedDirection) direction = fixedDirection;
    else if (code === 58) direction = branches.get(key)!;
    if (code === 58 || fixedDirection) redirects.push([current.x, current.y, direction]);
    const vector: Readonly<Record<Direction, readonly [number, number]>> = {
      east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1],
    };
    const [dx, dy] = vector[direction];
    current = { x: current.x + dx, y: current.y + dy };
    cells.push([current.x, current.y]);
  }
  assert.fail('APK direction field reaches an exit');
}

test('preserves every Lucky Lake TDM byte, map dimension, and source frequency', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_07.tdm'));
  assert.equal(map.id, 'lucky-lake');
  assert.equal(map.source.resource, 'res/raw/td_map_07.tdm');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  assert.equal(bytes.length, 2 + 32 * 24);
  assert.equal(map.map.width, 32);
  assert.equal(map.map.height, 24);
  assert.equal(map.map.tileSize, 32);
  assert.equal(map.originalTileGrid.length, 24);

  for (let y = 0; y < 24; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, 32, `row ${y} has 32 cells`);
    for (let x = 0; x < 32; x += 1) {
      assert.equal(bytes[2 + y * 32 + x], map.originalTileGrid[y]?.[x], `TDM cell (${x}, ${y})`);
    }
  }
  const frequency = new Map<number, number>();
  for (const code of bytes.subarray(2)) frequency.set(code, (frequency.get(code) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries([...frequency].sort(([a], [b]) => a - b)), expectedFrequency);
});

test('rebuilds the original Lucky Lake background, path, bridge, and railway layers cell-for-cell', () => {
  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 32 * 24);
  assert.deepEqual({
    paths: map.map.streets.filter(({ asset }) => asset === 'tiles_path' || asset === 'tiles_path_var').length,
    horizontalBridges: map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length,
    verticalBridges: map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length,
    verticalRailTiles: map.map.streets.filter(({ asset }) => asset === 'tiles_railway_verti').length,
  }, { paths: 84, horizontalBridges: 3, verticalBridges: 13, verticalRailTiles: 21 });

  for (const asset of new Set([
    ...map.map.background.map(({ asset }) => asset),
    ...map.map.streets.map(({ asset }) => asset),
  ])) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `asset ${asset} exists`);
  }
});

test('maps all APK decorations and recruitment buildings to their original TDM cells', () => {
  const scene = createLuckyLakeMapScene();
  const assetByCode: Readonly<Record<number, string>> = {
    68: 'e_1x1_cactus_a', 69: 'e_1x1_rocks_a', 70: 'e_1x1_rocks_b', 71: 'e_1x1_tree',
    73: 'e_1x1_cactus_b', 74: 'b_1x1_windmill', 75: 'b_1x1_watertower', 76: 'e_1x1_bush',
    94: 'tiles_railway_buffers_verti_up', 95: 'tiles_railway_buffers_verti_down',
    112: 'b_3x2_saloon', 113: 'b_3x2_fort', 114: 'b_2x1_tipi', 116: 'b_2x1_shack',
    117: 'b_1x1_tipi_small', 126: 'e_1x1_rocks_water',
  };
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    assetByCode[code] ? [{ asset: assetByCode[code]!, cell: { x, y } }] : []
  )));
  assert.deepEqual(scene.decorations?.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.equal(scene.decorations?.length, 36);
  assert.equal(scene.decorations?.filter(({ asset }) => !['b_3x2_saloon', 'b_3x2_fort', 'b_2x1_tipi'].includes(asset)).length, 33);
  assert.deepEqual(scene.decorations?.filter(({ asset }) => asset.startsWith('tiles_railway_buffers_'))
    .map(({ asset, cell }) => ({ asset, cell })), [
    { asset: 'tiles_railway_buffers_verti_up', cell: { x: 7, y: 0 } },
    { asset: 'tiles_railway_buffers_verti_down', cell: { x: 7, y: 22 } },
  ]);
  assert.equal(scene.decorations?.filter(({ asset }) => ['b_3x2_saloon', 'b_3x2_fort', 'b_2x1_tipi'].includes(asset)).length, 3);

  for (const asset of new Set((scene.decorations ?? []).map(({ asset }) => asset))) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `asset ${asset} exists`);
  }
});

test('creates original map units with profile-gated specials and the complete seven-piece vertical train', () => {
  const units = createLuckyLakeUnits(() => true);
  assert.equal(units.length, 47);
  assert.deepEqual(Object.fromEntries(
    ['gunslinger', 'mexican', 'cannon', 'indian', 'sniper', 'grandpa', 'pyromaniac', 'salesman']
      .map((type) => [type, units.filter((unit) => unit.type === type).length]),
  ), {
    gunslinger: 13, mexican: 7, cannon: 7, indian: 7, sniper: 1, grandpa: 3, pyromaniac: 1, salesman: 1,
  });
  const train = units.filter(({ movementGroupId }) => movementGroupId === 'lucky-lake-train');
  assert.deepEqual(train.map(({ cell, type }) => [type, cell.x, cell.y]), [
    ...[10, 11, 12, 13, 14].map((y) => ['train-22', 7, y]),
    ['train-20', 7, 15], ['train-21', 7, 16],
  ]);
  assert.equal(createLuckyLakeUnits((unitTypeId) => unitTypeId <= 4).filter(({ type }) => (
    ['sniper', 'grandpa', 'pyromaniac', 'salesman'].includes(type)
  )).length, 0);
  assert.equal(createLuckyLakeUnits((unitTypeId) => unitTypeId <= 4).filter(({ movementGroupId }) => (
    movementGroupId === 'lucky-lake-train'
  )).length, 7);
});

test('follows every direction-field branch from APK spawn scan order to its exact exit', () => {
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 42), [[31, 4]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 41), [[31, 13]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 40), [[31, 14]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 48), [[0, 14], [2, 23]]);
  assert.deepEqual(luckyLakeSpawnPoints, [
    { cell: { x: 31, y: 4 }, direction: 'west' },
    { cell: { x: 31, y: 13 }, direction: 'west' },
    { cell: { x: 31, y: 14 }, direction: 'west' },
  ]);
  assert.deepEqual(luckyLakeExits, [{ x: 0, y: 14 }, { x: 2, y: 23 }]);
  assert.equal(luckyLakeRouteDefinitions.length, routeExpectations.length);

  for (const [index, expected] of routeExpectations.entries()) {
    const route = luckyLakeRouteDefinitions[index]!;
    const spawn: WaveSpawn = luckyLakeSpawnPoints[expected.pool]!;
    assert.deepEqual(route.spawn, spawn);
    assert.deepEqual(route.exit, { x: expected.exit[0], y: expected.exit[1] });
    const traced = traceOriginalRoute(spawn, expected.branches as readonly (readonly [number, number, Direction])[]);
    assert.deepEqual(expandRoute(route), traced.cells);
    assert.equal(traced.cells.length, expected.length);
    assert.ok(traced.cells.every(([x, y]) => ![124, 125, 126].includes(map.originalTileGrid[y]?.[x] ?? -1)),
      'the original route never crosses impassable water');
    assert.deepEqual(traced.cells.flatMap(([x, y]) => {
      const code = map.originalTileGrid[y]?.[x];
      return code === 80 || code === 88 || code === 89 ? [[x, y, code]] : [];
    }), expected.crossings);
    assert.deepEqual(route.redirects.map(({ cell, directions }) => [cell.x, cell.y, directions[0]]), traced.redirects);
    for (const control of [...expected.branches, ...expected.redirects]) {
      assert.ok(route.redirects.some(({ cell, directions }) => (
        cell.x === control[0] && cell.y === control[1] && directions[0] === control[2]
      )), `audited control point ${control.slice(0, 2).join(',')} is present`);
    }
    assert.deepEqual(route.exit, { x: traced.exit[0], y: traced.exit[1] });
  }

  const originalRedirects = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    (code >= 52 && code <= 55) || code === 58 ? [`${x},${y}`] : []
  ))).sort();
  assert.deepEqual(luckyLakeRedirects.map(({ cell }) => `${cell.x},${cell.y}`).sort(), originalRedirects);
  assert.equal(luckyLakeRedirects.length, 34);
  assert.deepEqual(luckyLakeRedirects.filter(({ cell }) => (
    (cell.x === 23 && cell.y === 13) || (cell.x === 5 && cell.y === 18)
  )).map(({ cell, directions }) => ({ cell, directions })), [
    { cell: { x: 23, y: 13 }, directions: ['north', 'south'] },
    { cell: { x: 5, y: 18 }, directions: ['north', 'south'] },
  ]);

  const scenario = {
    id: 'lucky-lake-map-test',
    title: map.title,
    map: createLuckyLakeMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: createLuckyLakeUnits(() => true),
    previewWave: {
      number: 1,
      initialLives: 50,
      spawn: luckyLakeSpawnPoints[0]!,
      additionalSpawns: luckyLakeSpawnPoints.slice(1),
      routes: luckyLakeRouteDefinitions,
      baseEnemySpeed: 500,
      speedMultiplierMin: 90,
      speedMultiplierCount: 20,
      escapePenalty: 1,
      redirects: luckyLakeRedirects,
      exit: luckyLakeExits[0]!,
      additionalExits: luckyLakeExits.slice(1),
    },
  } satisfies ScenarioContent;
  const priority = createRoutePriorityMap(scenario);
  assert.ok(priority.minValue > 0);
  for (const expected of routeExpectations) {
    const route = luckyLakeRouteDefinitions[routeExpectations.indexOf(expected)]!;
    for (const [x, y] of expandRoute(route)) assert.ok(priority.getTargetPriority(x, y) > 0, `route cell ${x},${y} has a priority`);
  }
});
