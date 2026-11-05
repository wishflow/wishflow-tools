import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-04.json';
import { techTownRouteDefinitions } from '../src/content/tech-town-routes';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedCellsByCode: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  40: [[0, 3]],
  41: [[0, 4]],
  42: [[11, 23]],
  43: [[12, 23]],
  48: [[31, 17], [31, 18]],
  52: [[11, 15], [12, 16], [10, 20], [9, 21]],
  53: [[8, 3], [7, 4], [25, 9], [24, 10]],
  54: [[12, 20], [11, 21]],
  55: [[8, 9], [11, 9], [7, 10], [12, 10], [9, 15], [10, 16], [25, 17], [24, 18]],
  96: [[24, 3], [15, 5], [20, 5], [29, 6], [11, 7], [27, 9], [29, 10]],
  97: [[17, 3], [27, 3], [10, 4], [13, 5], [24, 5]],
  98: [[15, 14], [21, 15], [15, 19], [18, 21]],
  99: [[2, 7], [4, 9], [1, 15], [6, 15], [6, 19], [3, 20]],
  100: [[18, 11]],
  101: [[22, 6], [27, 15], [26, 19]],
  112: [[13, 3]],
  113: [[22, 20]],
  114: [[5, 17]],
  150: [[30, 3]],
};

const directionByCode = { 52: 'north', 53: 'south', 54: 'west', 55: 'east' } as const;
const directionVector = {
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
} as const;

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

function expandRoute(route: (typeof techTownRouteDefinitions)[number]): [number, number][] {
  const pathCells: [number, number][] = [[route.spawn.cell.x, route.spawn.cell.y]];
  let current = { ...route.spawn.cell };
  let direction = route.spawn.direction;

  for (const target of [...route.redirects, { cell: route.exit, directions: [] }]) {
    const vector = directionVector[direction];
    assert.ok(
      (current.x === target.cell.x || current.y === target.cell.y)
      && Math.sign(target.cell.x - current.x) === vector.x
      && Math.sign(target.cell.y - current.y) === vector.y,
      `route from (${current.x}, ${current.y}) must continue ${direction} to (${target.cell.x}, ${target.cell.y})`,
    );

    while (current.x !== target.cell.x || current.y !== target.cell.y) {
      current = { x: current.x + vector.x, y: current.y + vector.y };
      assert.ok(current.x >= 0 && current.x < map.map.width, `route x=${current.x} stays inside the map`);
      assert.ok(current.y >= 0 && current.y < map.map.height, `route y=${current.y} stays inside the map`);

      const rawCode = map.originalTileGrid[current.y]?.[current.x];
      if (rawCode === 48 || (rawCode !== undefined && rawCode >= 52 && rawCode <= 65)) {
        assert.deepEqual(
          current,
          target.cell,
          `route must visit raw field ${rawCode} at (${current.x}, ${current.y}) before continuing`,
        );
      }
      pathCells.push([current.x, current.y]);
    }

    if (target.cell !== route.exit) direction = target.directions[0]!;
  }

  return pathCells;
}

test('preserves the original Tech Town 32×24 TDM bytes and grid', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_04.tdm'));
  const { width, height } = map.map;

  assert.equal(map.id, 'tech-town');
  assert.equal(map.source.resource, 'res/raw/td_map_04.tdm');
  assert.deepEqual([...tdm.subarray(0, 2)], [width, height]);
  assert.equal(width, 32);
  assert.equal(height, 24);
  assert.equal(tdm.length, 2 + (width * height));
  assert.equal(map.originalTileGrid.length, height);

  for (let y = 0; y < height; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, width, `row ${y} has ${width} cells`);
    for (let x = 0; x < width; x += 1) {
      assert.equal(tdm[2 + (y * width) + x], map.originalTileGrid[y]?.[x], `TDM cell (${x}, ${y})`);
    }
  }
});

test('preserves all Tech Town entrance, exit, direction-field and object coordinates', () => {
  for (const [code, expected] of Object.entries(expectedCellsByCode)) {
    assert.deepEqual(
      coordinatesForCode(map.originalTileGrid, Number(code)),
      expected,
      `TDM code ${code} retains every original coordinate`,
    );
  }
});

test('reconstructs all four APK routes, including their directed railway crossings', () => {
  assert.deepEqual(techTownRouteDefinitions.map(({ spawn, redirects, exit }) => ({
    spawn: [spawn.cell.x, spawn.cell.y, spawn.direction],
    redirects: redirects.map(({ cell, directions }) => [cell.x, cell.y, directions[0]]),
    exit: [exit.x, exit.y],
  })), [
    {
      spawn: [0, 3, 'east'],
      redirects: [[8, 3, 'south'], [8, 9, 'east'], [11, 9, 'east'], [25, 9, 'south'], [25, 17, 'east']],
      exit: [31, 17],
    },
    {
      spawn: [0, 4, 'east'],
      redirects: [[7, 4, 'south'], [7, 10, 'east'], [12, 10, 'east'], [24, 10, 'south'], [24, 18, 'east']],
      exit: [31, 18],
    },
    {
      spawn: [11, 23, 'north'],
      redirects: [[11, 21, 'west'], [9, 21, 'north'], [9, 15, 'east'], [11, 15, 'north'], [11, 9, 'east'], [25, 9, 'south'], [25, 17, 'east']],
      exit: [31, 17],
    },
    {
      spawn: [12, 23, 'north'],
      redirects: [[12, 20, 'west'], [10, 20, 'north'], [10, 16, 'east'], [12, 16, 'north'], [12, 10, 'east'], [24, 10, 'south'], [24, 18, 'east']],
      exit: [31, 18],
    },
  ]);

  const railCrossings = techTownRouteDefinitions.map((route) =>
    expandRoute(route).filter(([x, y]) => {
      const code = map.originalTileGrid[y]?.[x] ?? 0;
      return code >= 80 && code <= 88;
    }));
  assert.deepEqual(railCrossings, [
    [[3, 3], [8, 6], [16, 9], [25, 12], [25, 14]],
    [[3, 4], [7, 6], [16, 10], [24, 12], [24, 14]],
    [[9, 18], [11, 12], [16, 9], [25, 12], [25, 14]],
    [[10, 18], [12, 12], [16, 10], [24, 12], [24, 14]],
  ]);

  const visitedDirectionFields = new Set<string>();
  for (const [routeIndex, route] of techTownRouteDefinitions.entries()) {
    assert.equal(
      map.originalTileGrid[route.spawn.cell.y]?.[route.spawn.cell.x],
      40 + routeIndex,
      'each route starts at the matching APK spawn field',
    );
    assert.equal(map.originalTileGrid[route.exit.y]?.[route.exit.x], 48, 'each route ends at an APK exit field');

    for (const redirect of route.redirects) {
      const code = map.originalTileGrid[redirect.cell.y]?.[redirect.cell.x];
      assert.ok(code !== undefined && code >= 52 && code <= 55, 'each redirect is an APK direction field');
      assert.deepEqual(redirect.directions, [directionByCode[code as keyof typeof directionByCode]]);
      visitedDirectionFields.add(`${redirect.cell.x},${redirect.cell.y}`);
    }

    assert.ok(expandRoute(route).length > 1, 'each spawn has a complete route to an exit');
  }

  assert.deepEqual(
    [...visitedDirectionFields].sort(),
    [52, 53, 54, 55].flatMap((code) => coordinatesForCode(map.originalTileGrid, code).map(([x, y]) => `${x},${y}`)).sort(),
    'the four route graphs account for every raw direction field',
  );
});
