import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createMississippi12MapScene } from '../src/content/mississippi-12-scene';
import map from '../src/content/mississippi-12.json';
import { createMississippi12MapUnits } from '../src/content/mississippi-12-units';
import { mississippi12RouteDefinitions } from '../src/content/mississippi-12-routes';
import type { Direction, WaveRouteDefinition } from '../src/game';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRECTIONS_BY_ACTION_ID: readonly (readonly Direction[])[] = [
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
];
const VECTOR_BY_DIRECTION: Readonly<Record<Direction, { x: number; y: number }>> = {
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
};

interface Field {
  cell: { x: number; y: number };
  code: number;
  kind: 'spawn' | 'turn' | 'exit';
}

function readApkGrid(): number[][] {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_15.tdm'));
  const width = bytes[0]!;
  const height = bytes[1]!;
  assert.deepEqual([width, height], [32, 24]);
  return Array.from({ length: height }, (_, y) => (
    Array.from(bytes.subarray(2 + (y * width), 2 + ((y + 1) * width)))
  ));
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function fieldAt(code: number, x: number, y: number): Field | undefined {
  if (code >= 40 && code <= 46) return { cell: { x, y }, code, kind: 'spawn' };
  if (code === 48) return { cell: { x, y }, code, kind: 'exit' };
  if (code >= 52 && code <= 65) return { cell: { x, y }, code, kind: 'turn' };
  return undefined;
}

function spawnDirection(cell: { x: number; y: number }, width: number, height: number): Direction {
  if (cell.x >= width - 1) return 'west';
  if (cell.x === 0) return 'east';
  if (cell.y >= height - 1) return 'north';
  if (cell.y === 0) return 'south';
  throw new Error(`Map15 spawn is not on the map edge: ${cellKey(cell)}`);
}

function nextControl(
  grid: readonly (readonly number[])[],
  start: { x: number; y: number },
  direction: Direction,
): Field | undefined {
  const vector = VECTOR_BY_DIRECTION[direction];
  let x = start.x;
  let y = start.y;
  while (true) {
    x += vector.x;
    y += vector.y;
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0]!.length) return undefined;
    const next = fieldAt(grid[y]![x]!, x, y);
    if (next?.kind === 'turn' || next?.kind === 'exit') return next;
  }
}

function routesFromApkGrid(grid: readonly (readonly number[])[]): WaveRouteDefinition[] {
  const fields = grid.flatMap((row, y) => row.flatMap((code, x) => {
    const field = fieldAt(code, x, y);
    return field ? [field] : [];
  }));
  const spawns = fields.filter(({ kind }) => kind === 'spawn');
  const routes: WaveRouteDefinition[] = [];

  for (const spawn of spawns) {
    const firstDirection = spawnDirection(spawn.cell, grid[0]!.length, grid.length);
    const walk = (
      current: Field,
      direction: Direction,
      redirects: WaveRouteDefinition['redirects'],
      visited: ReadonlySet<string>,
    ): void => {
      const next = nextControl(grid, current.cell, direction);
      assert.ok(next, `Map15 route leaves the grid at ${cellKey(current.cell)}`);
      assert.ok(!visited.has(cellKey(next.cell)), `Map15 route cycle reaches ${cellKey(next.cell)}`);
      const nextRedirects = current.kind === 'turn'
        ? [...redirects, { cell: current.cell, directions: [direction] }]
        : redirects;
      if (next.kind === 'exit') {
        routes.push({ spawn: { cell: spawn.cell, direction: firstDirection }, redirects: nextRedirects, exit: next.cell });
        return;
      }

      const directions = DIRECTIONS_BY_ACTION_ID[next.code - 52];
      assert.ok(directions, `Map15 action ${next.code} has a DEX direction mapping`);
      const nextVisited = new Set(visited).add(cellKey(next.cell));
      for (const nextDirection of directions) walk(next, nextDirection, nextRedirects, nextVisited);
    };

    walk(spawn, firstDirection, [], new Set([cellKey(spawn.cell)]));
  }
  return routes;
}

function routeSignature(route: WaveRouteDefinition): string {
  return [
    `${cellKey(route.spawn.cell)}:${route.spawn.direction}`,
    ...route.redirects.map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`),
    `${cellKey(route.exit)}:exit`,
  ].join('|');
}

test('covers every APK map15 route edge, branch, spawn-to-exit path, and action field', () => {
  const grid = readApkGrid();
  assert.deepEqual(map.originalTileGrid, grid);
  const fields = grid.flatMap((row, y) => row.flatMap((code, x) => {
    const field = fieldAt(code, x, y);
    return field ? [field] : [];
  }));
  const spawns = fields.filter(({ kind }) => kind === 'spawn');
  const turns = fields.filter(({ kind }) => kind === 'turn');
  const exits = fields.filter(({ kind }) => kind === 'exit');
  assert.equal(spawns.length, 2);
  assert.equal(turns.length, 26);
  assert.equal(exits.length, 2);
  assert.deepEqual(spawns.map(({ cell }) => cell), [{ x: 0, y: 9 }, { x: 0, y: 15 }]);
  assert.deepEqual(exits.map(({ cell }) => cell), [{ x: 31, y: 9 }, { x: 31, y: 15 }]);

  const branchCells = turns.filter(({ code }) => DIRECTIONS_BY_ACTION_ID[code - 52]!.length > 1)
    .map(({ cell }) => cellKey(cell)).sort();
  assert.deepEqual(branchCells, ['15,9', '16,15', '2,15', '22,15', '23,9', '28,9', '7,9', '8,15']);

  const expectedRoutes = routesFromApkGrid(grid);
  assert.equal(expectedRoutes.length, 36);
  assert.equal(expectedRoutes.filter(({ spawn }) => spawn.cell.y === 9).length, 12);
  assert.equal(expectedRoutes.filter(({ spawn }) => spawn.cell.y === 15).length, 24);
  assert.equal(mississippi12RouteDefinitions.length, expectedRoutes.length);
  assert.deepEqual(
    mississippi12RouteDefinitions.map(routeSignature).sort(),
    expectedRoutes.map(routeSignature).sort(),
  );

  const edgeKeys = new Set<string>();
  const visitedTurns = new Set<string>();
  const spawnRouteCounts = new Map<string, number>();
  for (const route of mississippi12RouteDefinitions) {
    const spawnKey = `${cellKey(route.spawn.cell)}:${route.spawn.direction}`;
    spawnRouteCounts.set(spawnKey, (spawnRouteCounts.get(spawnKey) ?? 0) + 1);
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const waypoint of [...route.redirects, { cell: route.exit, directions: [] as Direction[] }]) {
      const next = nextControl(grid, current, direction);
      assert.deepEqual(next?.cell, waypoint.cell, 'route follows the nearest action-2 or action-3 field');
      edgeKeys.add(`${cellKey(current)}:${direction}->${cellKey(waypoint.cell)}`);
      if (next?.kind === 'exit') break;
      const marker = grid[waypoint.cell.y]?.[waypoint.cell.x];
      const allowedDirections = DIRECTIONS_BY_ACTION_ID[marker! - 52];
      assert.ok(allowedDirections?.includes(waypoint.directions[0]!), `TDM action ${marker} allows its route direction`);
      assert.equal(waypoint.directions.length, 1, 'each complete path selects one branch at each control');
      visitedTurns.add(cellKey(waypoint.cell));
      current = waypoint.cell;
      direction = waypoint.directions[0]!;
    }
  }
  assert.equal(edgeKeys.size, 36);
  assert.equal(visitedTurns.size, 26);
  assert.deepEqual([...spawnRouteCounts.entries()].sort(), [['0,15:east', 24], ['0,9:east', 12]]);
  for (const spawn of spawns) {
    assert.deepEqual(
      [...new Set(mississippi12RouteDefinitions
        .filter(({ spawn: routeSpawn }) => cellKey(routeSpawn.cell) === cellKey(spawn.cell))
        .map(({ exit }) => cellKey(exit)))].sort(),
      ['31,15', '31,9'],
      `both exits are reachable from ${cellKey(spawn.cell)}`,
    );
  }
});

test('creates only fresh map15 units and gates its Pyromaniac marker by the global unlock', () => {
  const flatGrid = map.originalTileGrid.flat();
  const markerCount = (code: number) => flatGrid.filter((value) => value === code).length;
  assert.equal(markerCount(104), 1);
  assert.equal(markerCount(130), 1);
  assert.equal(flatGrid.filter((code) => code >= 96 && code <= 101).length, 12, 'these are load-save markers, not fresh units');
  assert.equal(flatGrid.some((code) => code === 83 || code === 84 || (code >= 112 && code <= 114)), false);
  assert.equal(flatGrid.includes(132), false, 'map15 has no fresh Gatling marker');
  assert.equal(createMississippi12MapScene().decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);

  const lockedUnits = createMississippi12MapUnits();
  assert.deepEqual(lockedUnits.map(({ id, type, activity, cell }) => ({ id, type, activity, cell })), [
    { id: 'gunslinger-1', type: 'gunslinger', activity: 5, cell: { x: 11, y: 11 } },
  ]);
  assert.equal(lockedUnits[0]?.movementSpeedFinePer100Ms, 1500);
  assert.deepEqual(lockedUnits[0]?.weapon, {
    damage: 140,
    damageType: 'light',
    rangeFine: 38400,
    reloadTimeMs: 500,
    projectileSpeed: 600,
    damageStyle: 0,
    specialReloadTimeMs: 1500,
    specialReloadFrequency: 6,
  });

  const unlockedUnits = createMississippi12MapUnits((unitTypeId) => unitTypeId === 35);
  assert.deepEqual(unlockedUnits.map(({ type, activity, cell }) => ({ type, activity, cell })), [
    { type: 'gunslinger', activity: 5, cell: { x: 11, y: 11 } },
    { type: 'pyromaniac', activity: 4, cell: { x: 18, y: 16 } },
  ]);
});
