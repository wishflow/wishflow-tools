import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import map from '../src/content/mississippi-11.json';
import { createMississippi11MapScene } from '../src/content/mississippi-11-scene';
import { mississippi11RouteDefinitions } from '../src/content/mississippi-11-routes';
import { createMississippi11MapUnits } from '../src/content/mississippi-11-units';
import type { Direction, WaveRouteDefinition } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const actionDirections: Readonly<Record<number, readonly Direction[]>> = Object.freeze({
  52: ['north'],
  53: ['south'],
  54: ['west'],
  55: ['east'],
  56: ['north', 'west'],
  57: ['north', 'east'],
});
const spawnDirections: Readonly<Record<number, Direction>> = Object.freeze({
  40: 'east',
  41: 'east',
  42: 'west',
  43: 'west',
});
const vectorByDirection: Readonly<Record<Direction, { x: number; y: number }>> = Object.freeze({
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
});

interface GraphNode {
  code: number;
  cell: { x: number; y: number };
}

interface GraphEdge {
  from: GraphNode;
  direction: Direction;
  to: GraphNode;
}

function readMap14Grid(): number[][] {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_14.tdm'));
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

function graphNodeAt(grid: readonly (readonly number[])[], x: number, y: number): GraphNode | undefined {
  const code = grid[y]?.[x];
  if (code === undefined || (code !== 48 && actionDirections[code] === undefined)) return undefined;
  return { code, cell: { x, y } };
}

function nextGraphNode(
  grid: readonly (readonly number[])[],
  cell: { x: number; y: number },
  direction: Direction,
): GraphNode | undefined {
  const vector = vectorByDirection[direction];
  let x = cell.x;
  let y = cell.y;
  while (true) {
    x += vector.x;
    y += vector.y;
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0]!.length) return undefined;
    const next = graphNodeAt(grid, x, y);
    if (next) return next;
  }
}

function routeSignature(route: WaveRouteDefinition): string {
  return [
    `${cellKey(route.spawn.cell)}:${route.spawn.direction}`,
    ...route.redirects.map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`),
    `${cellKey(route.exit)}:exit`,
  ].join('|');
}

function routesFromTdm(grid: readonly (readonly number[])[]): WaveRouteDefinition[] {
  const spawns: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const [y, row] of grid.entries()) {
    for (const [x, code] of row.entries()) {
      if (spawnDirections[code]) {
        spawns.push({ code, cell: { x, y } });
        const to = nextGraphNode(grid, { x, y }, spawnDirections[code]!);
        assert.ok(to && to.code !== 48, `spawn marker ${code} reaches a route field`);
        edges.push({ from: { code, cell: { x, y } }, direction: spawnDirections[code]!, to });
        continue;
      }
      for (const direction of actionDirections[code] ?? []) {
        const to = nextGraphNode(grid, { x, y }, direction);
        if (to) edges.push({ from: { code, cell: { x, y } }, direction, to });
      }
    }
  }

  const outgoing = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const key = cellKey(edge.from.cell);
    outgoing.set(key, [...(outgoing.get(key) ?? []), edge]);
  }

  const result: WaveRouteDefinition[] = [];
  for (const spawn of spawns) {
    const walk = (node: GraphNode, pathEdges: GraphEdge[], seen: Set<string>) => {
      for (const edge of outgoing.get(cellKey(node.cell)) ?? []) {
        const nextKey = cellKey(edge.to.cell);
        assert.ok(!seen.has(nextKey), `map14 route graph is acyclic at ${nextKey}`);
        const nextSeen = new Set(seen).add(nextKey);
        const nextPath = [...pathEdges, edge];
        if (edge.to.code === 48) {
          result.push({
            spawn: { cell: { ...spawn.cell }, direction: nextPath[0]!.direction },
            redirects: nextPath.slice(1).map(({ from, direction }) => ({
              cell: { ...from.cell },
              directions: [direction],
            })),
            exit: { ...edge.to.cell },
          });
        } else {
          walk(edge.to, nextPath, nextSeen);
        }
      }
    };
    walk(spawn, [], new Set([cellKey(spawn.cell)]));
  }
  return result;
}

test('covers every APK map14 spawn-to-exit branch and all 59 directed route edges', () => {
  const grid = readMap14Grid();
  assert.equal(grid.flat().filter((code) => actionDirections[code] !== undefined).length, 48);
  assert.equal(grid.flat().filter((code) => spawnDirections[code] !== undefined).length, 4);
  assert.equal(grid.flat().filter((code) => code === 48).length, 2);
  const expectedRoutes = routesFromTdm(grid);
  assert.equal(expectedRoutes.length, 13);
  assert.equal(mississippi11RouteDefinitions.length, expectedRoutes.length);

  const expectedSignatures = expectedRoutes.map(routeSignature).sort();
  const actualSignatures = mississippi11RouteDefinitions.map(routeSignature).sort();
  assert.deepEqual(actualSignatures, expectedSignatures);

  const actualSpawnCounts = new Map<string, number>();
  const visitedControls = new Set<string>();
  for (const route of mississippi11RouteDefinitions) {
    const key = `${cellKey(route.spawn.cell)}:${route.spawn.direction}`;
    actualSpawnCounts.set(key, (actualSpawnCounts.get(key) ?? 0) + 1);
    for (const redirect of route.redirects) {
      const marker = grid[redirect.cell.y]?.[redirect.cell.x];
      assert.ok(actionDirections[marker!]?.includes(redirect.directions[0]!), `TDM field ${marker} permits ${redirect.directions[0]}`);
      assert.equal(redirect.directions.length, 1, 'each expanded path selects one original branch');
      visitedControls.add(cellKey(redirect.cell));
    }
  }

  assert.deepEqual([...actualSpawnCounts.entries()].sort(), [
    ['0,15:east', 5],
    ['0,16:east', 3],
    ['31,15:west', 2],
    ['31,16:west', 3],
  ]);
  assert.deepEqual([...new Set(mississippi11RouteDefinitions.map(({ exit }) => cellKey(exit)))].sort(), ['14,0', '15,0']);
  assert.equal(visitedControls.size, 48, 'all 48 route controls are reachable from the four spawns');

  const expectedEdges = new Set<string>();
  for (const pathRoute of expectedRoutes) {
    let current = pathRoute.spawn.cell;
    let direction = pathRoute.spawn.direction;
    for (const waypoint of [...pathRoute.redirects, { cell: pathRoute.exit, directions: [] as Direction[] }]) {
      const next = nextGraphNode(grid, current, direction);
      assert.deepEqual(next?.cell, waypoint.cell, 'a route follows the nearest next APK action marker');
      expectedEdges.add(`${cellKey(current)}:${direction}->${cellKey(waypoint.cell)}`);
      if (waypoint.cell.x === pathRoute.exit.x && waypoint.cell.y === pathRoute.exit.y) break;
      current = waypoint.cell;
      direction = waypoint.directions[0]!;
    }
  }
  assert.equal(expectedEdges.size, 59);
});

test('places map14 static scenery at every APK cell with the original rail-buffer collision', () => {
  const grid = readMap14Grid();
  const scene = createMississippi11MapScene();
  assert.deepEqual(scene.background, map.map.background);
  assert.deepEqual(scene.streets, map.map.streets);

  const expectedAssets: Readonly<Record<number, string>> = {
    69: 'e_1x1_rocks_a',
    70: 'e_1x1_rocks_b',
    71: 'e_1x1_tree',
    74: 'b_1x1_windmill',
    75: 'b_1x1_watertower',
    86: 'tiles_railway_buffers_hori_left',
    87: 'tiles_railway_buffers_hori_right',
    126: 'e_1x1_rocks_water',
  };
  const expected = grid.flatMap((row, y) => row.flatMap((code, x) => (
    expectedAssets[code] ? [{ asset: expectedAssets[code]!, cell: { x, y } }] : []
  )));
  const actual = scene.decorations ?? [];
  assert.deepEqual(actual.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.equal(actual.length, 25);
  assert.deepEqual(actual.filter(({ asset }) => asset.startsWith('tiles_railway_buffers_'))
    .map(({ asset, cell, collisionBoxFine }) => ({ asset, cell, collisionBoxFine })), [
      { asset: 'tiles_railway_buffers_hori_left', cell: { x: 0, y: 18 }, collisionBoxFine: { x: 0, y: -3840, width: 7680, height: 7680 } },
      { asset: 'tiles_railway_buffers_hori_right', cell: { x: 14, y: 18 }, collisionBoxFine: { x: 0, y: -3840, width: 7680, height: 7680 } },
      { asset: 'tiles_railway_buffers_hori_left', cell: { x: 22, y: 18 }, collisionBoxFine: { x: 0, y: -3840, width: 7680, height: 7680 } },
      { asset: 'tiles_railway_buffers_hori_right', cell: { x: 31, y: 18 }, collisionBoxFine: { x: 0, y: -3840, width: 7680, height: 7680 } },
    ]);

  for (const asset of new Set(actual.map(({ asset }) => asset))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('creates only the two fresh-game map14 player units', () => {
  const units = createMississippi11MapUnits();
  assert.deepEqual(units.map(({ id, type, activity, cell, asset, movementSpeedFinePer100Ms }) => ({
    id, type, activity, cell, asset, movementSpeedFinePer100Ms,
  })), [
    {
      id: 'mexican-1', type: 'mexican', activity: 5,
      cell: { x: 11, y: 11 }, asset: 'player_mexican', movementSpeedFinePer100Ms: 1500,
    },
    {
      id: 'gunslinger-1', type: 'gunslinger', activity: 5,
      cell: { x: 18, y: 12 }, asset: 'player_gunslinger', movementSpeedFinePer100Ms: 1500,
    },
  ]);
  for (const unit of units) {
    assert.ok(unit.weapon);
    assert.deepEqual(unit.frame, { x: 0, y: 0, width: 32, height: 44 });
    assert.deepEqual(unit.render, unit.hitArea);
  }
});
