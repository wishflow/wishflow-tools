import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-14.json';
import { mississippi14RouteDefinitions } from '../src/content/mississippi-14-routes';
import type { Direction, WaveRouteDefinition } from '../src/game';

const appRoot = path.resolve(import.meta.dirname, '..');
const directionsByActionId: readonly (readonly Direction[])[] = [
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
];
const vectorByDirection: Readonly<Record<Direction, { x: number; y: number }>> = {
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
};

interface RouteField {
  cell: { x: number; y: number };
  code: number;
  kind: 'spawn' | 'turn' | 'exit';
}

function fieldAt(grid: readonly (readonly number[])[], x: number, y: number): RouteField | undefined {
  const code = grid[y]?.[x];
  if (code === undefined) return undefined;
  if (code >= 40 && code <= 46) return { cell: { x, y }, code, kind: 'spawn' };
  if (code === 48) return { cell: { x, y }, code, kind: 'exit' };
  if (code >= 52 && code <= 65) return { cell: { x, y }, code, kind: 'turn' };
  return undefined;
}

function cellKey(cell: { x: number; y: number }): string {
  return String(cell.x) + ',' + cell.y;
}

function nextControl(
  grid: readonly (readonly number[])[],
  start: { x: number; y: number },
  direction: Direction,
): RouteField | undefined {
  const vector = vectorByDirection[direction];
  let x = start.x;
  let y = start.y;
  while (true) {
    x += vector.x;
    y += vector.y;
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0]!.length) return undefined;
    const field = fieldAt(grid, x, y);
    if (field?.kind === 'turn' || field?.kind === 'exit') return field;
  }
}

function routesFromApkGrid(grid: readonly (readonly number[])[]): WaveRouteDefinition[] {
  const fields = grid.flatMap((row, y) => row.flatMap((_, x) => {
    const field = fieldAt(grid, x, y);
    return field ? [field] : [];
  }));
  const routes: WaveRouteDefinition[] = [];
  for (const spawn of fields.filter(({ kind }) => kind === 'spawn')) {
    const direction: Direction = spawn.cell.x === 0 ? 'east'
      : spawn.cell.x === grid[0]!.length - 1 ? 'west'
        : spawn.cell.y === 0 ? 'south' : 'north';
    const walk = (
      current: RouteField,
      currentDirection: Direction,
      redirects: WaveRouteDefinition['redirects'],
      visited: ReadonlySet<string>,
    ) => {
      const next = nextControl(grid, current.cell, currentDirection);
      assert.ok(next, 'APK route leaves the grid from ' + cellKey(current.cell));
      assert.ok(!visited.has(cellKey(next.cell)), 'APK route cycles at ' + cellKey(next.cell));
      const nextRedirects = current.kind === 'turn'
        ? [...redirects, { cell: current.cell, directions: [currentDirection] }]
        : redirects;
      if (next.kind === 'exit') {
        routes.push({ spawn: { cell: spawn.cell, direction }, redirects: nextRedirects, exit: next.cell });
        return;
      }
      const directions = directionsByActionId[next.code - 52];
      assert.ok(directions, 'APK marker ' + next.code + ' has a decoded action');
      const nextVisited = new Set(visited).add(cellKey(next.cell));
      for (const nextDirection of directions) walk(next, nextDirection, nextRedirects, nextVisited);
    };
    walk(spawn, direction, [], new Set([cellKey(spawn.cell)]));
  }
  return routes;
}

function routeSignature(route: WaveRouteDefinition): string {
  return [
    cellKey(route.spawn.cell) + ':' + route.spawn.direction,
    ...route.redirects.map(({ cell, directions }) => cellKey(cell) + ':' + directions.join('/')),
    cellKey(route.exit) + ':exit',
  ].join('|');
}

test('Riverside Mountains routes cover every APK action marker and reach only mapped exits', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_17.tdm'));
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const grid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + y * 32, 2 + (y + 1) * 32)));
  assert.deepEqual(map.originalTileGrid, grid);

  const fields = grid.flatMap((row, y) => row.flatMap((_, x) => {
    const field = fieldAt(grid, x, y);
    return field ? [field] : [];
  }));
  const spawns = fields.filter(({ kind }) => kind === 'spawn');
  const turns = fields.filter(({ kind }) => kind === 'turn');
  const exits = fields.filter(({ kind }) => kind === 'exit');
  assert.equal(spawns.length, 6);
  assert.equal(turns.length, 60);
  assert.equal(exits.length, 4);
  assert.deepEqual(spawns.map(({ cell }) => cell), [
    { x: 0, y: 9 }, { x: 0, y: 10 }, { x: 0, y: 17 }, { x: 0, y: 18 }, { x: 9, y: 23 }, { x: 10, y: 23 },
  ]);
  assert.deepEqual(exits.map(({ cell }) => cell), [
    { x: 31, y: 10 }, { x: 31, y: 11 }, { x: 31, y: 20 }, { x: 31, y: 21 },
  ]);

  const expected = routesFromApkGrid(grid);
  assert.equal(expected.length, 23);
  assert.deepEqual(
    mississippi14RouteDefinitions.map(routeSignature).sort(),
    expected.map(routeSignature).sort(),
  );

  const visitedTurns = new Set<string>();
  const edgeKeys = new Set<string>();
  for (const route of mississippi14RouteDefinitions) {
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const waypoint of [...route.redirects, { cell: route.exit, directions: [] as Direction[] }]) {
      const next = nextControl(grid, current, direction);
      assert.deepEqual(next?.cell, waypoint.cell, 'each route follows the nearest APK action field');
      edgeKeys.add(cellKey(current) + ':' + direction + '->' + cellKey(waypoint.cell));
      if (next?.kind === 'exit') break;
      assert.equal(next?.kind, 'turn');
      const marker = grid[waypoint.cell.y]?.[waypoint.cell.x];
      const allowed = directionsByActionId[marker! - 52];
      assert.ok(allowed?.includes(waypoint.directions[0]!), 'TDM action ' + marker + ' allows the selected direction');
      assert.equal(waypoint.directions.length, 1);
      visitedTurns.add(cellKey(waypoint.cell));
      current = waypoint.cell;
      direction = waypoint.directions[0]!;
    }
  }
  assert.equal(edgeKeys.size, 75);
  assert.deepEqual(visitedTurns, new Set(turns.map(({ cell }) => cellKey(cell))));
});
