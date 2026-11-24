import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-09.json';
import { dakota09RouteDefinitions, dakota09SpawnPointIdByActionId } from '../src/content/dakota-09-routes';
import { createDakota09MapScene } from '../src/content/dakota-09-scene';
import routeGraph from './fixtures/snow-town-route-graph.json';
import { createMississippiRouteDefinitions } from '../src/content/mississippi-map-routes';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
type RouteNode = readonly [rawCode: number, x: number, y: number];

function gridFrom(bytes: Buffer): number[][] {
  const width = bytes[0]!;
  const height = bytes[1]!;
  return Array.from({ length: height }, (_, y) => Array.from(
    bytes.subarray(2 + (y * width), 2 + ((y + 1) * width)),
  ));
}

function routeNodes(grid: readonly (readonly number[])[]) {
  return createMississippiRouteDefinitions({
    originalTileGrid: grid,
    map: { width: grid[0]!.length, height: grid.length },
  }).map((route) => {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    return {
      actionId: grid[route.spawn.cell.y]![route.spawn.cell.x]! - 40,
      nodes: cells.map(({ x, y }) => [grid[y]![x]!, x, y] as RouteNode),
    };
  });
}

function intermediateRouteStats(
  routes: readonly { nodes: readonly RouteNode[] }[],
  grid: readonly (readonly number[])[],
) {
  const directionByDelta: Readonly<Record<string, string>> = {
    '0,-1': 'north', '0,1': 'south', '-1,0': 'west', '1,0': 'east',
  };
  const edgeSet = new Set<string>();
  const visitedCells = new Set<string>();
  const visitsByCode: Record<string, number> = {};
  let visits = 0;

  for (const route of routes) {
    for (let index = 0; index < route.nodes.length - 1; index += 1) {
      const from = route.nodes[index]!;
      const to = route.nodes[index + 1]!;
      const deltaX = Math.sign(to[1] - from[1]);
      const deltaY = Math.sign(to[2] - from[2]);
      const direction = directionByDelta[`${deltaX},${deltaY}`];
      assert.ok(direction, `control edge ${from[1]},${from[2]} to ${to[1]},${to[2]} is axis aligned`);
      edgeSet.add(`${from[1]},${from[2]}:${direction}->${to[1]},${to[2]}`);

      const distance = Math.abs(to[1] - from[1]) + Math.abs(to[2] - from[2]);
      for (let step = 1; step <= distance; step += 1) {
        if (to[0] === 48 && step === distance) continue;
        const x = from[1] + (deltaX * step);
        const y = from[2] + (deltaY * step);
        const rawCode = grid[y]![x]!;
        assert.ok(
          rawCode === 32 || (rawCode >= 52 && rawCode <= 55) || rawCode === 80 || rawCode === 81 || rawCode === 88,
          `route cell ${x},${y} is an APK route, bridge, or rail cell; found ${rawCode}`,
        );
        visits += 1;
        visitedCells.add(`${x},${y}`);
        visitsByCode[String(rawCode)] = (visitsByCode[String(rawCode)] ?? 0) + 1;
      }
    }
  }

  return {
    uniqueDirectedEdgeCount: edgeSet.size,
    intermediateCellVisits: visits,
    uniqueIntermediateRouteCells: visitedCells.size,
    intermediateVisitsByRawTile: Object.fromEntries(Object.entries(visitsByCode)
      .sort(([left], [right]) => Number(left) - Number(right))),
  };
}

test('Snow Town TDM fixture preserves the APK header, all 768 cells, and marker counts', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_42.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);

  const grid = gridFrom(bytes);
  assert.equal(grid.length, 24);
  assert.ok(grid.every((row) => row.length === 32));
  assert.equal(routeGraph.resource, 'res/raw/td_map_42.tdm');
  assert.deepEqual(routeGraph.dimensions, [32, 24]);

  const allCodes = grid.flat();
  const counts = Object.fromEntries([...new Set(allCodes)].sort((a, b) => a - b).map((code) => [
    code,
    allCodes.filter((value) => value === code).length,
  ]));
  assert.deepEqual(counts, {
    0: 370, 16: 65, 32: 126, 36: 64, 40: 1, 41: 1, 42: 1, 48: 2,
    52: 4, 53: 12, 54: 6, 55: 11, 69: 6, 70: 2, 71: 3, 72: 1,
    74: 1, 75: 1, 76: 5, 80: 3, 81: 2, 82: 10, 83: 2, 84: 3,
    86: 1, 87: 1, 88: 14, 96: 9, 97: 11, 98: 6, 99: 9, 100: 1,
    101: 2, 112: 2, 113: 1, 114: 1, 116: 4, 117: 2, 130: 1, 131: 1,
  });

  assert.deepEqual(map.originalTileGrid, grid, 'web terrain data is sourced from the target APK TDM');
  assert.equal(map.id, 'snow-town');
  assert.deepEqual({ width: map.map.width, height: map.map.height, tileSize: map.map.tileSize }, {
    width: 32, height: 24, tileSize: 32,
  });
  const originalDrawCommands = deriveOriginalTdmMapDrawCommands({ originalTileGrid: grid });
  assert.deepEqual(map.map.background, originalDrawCommands.background, 'background commands match APK-derived terrain reference');
  assert.deepEqual(map.map.streets, originalDrawCommands.streets, 'street, bridge and rail commands match APK-derived reference');
  assert.deepEqual(createDakota09MapScene().backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map),
    'final collision background matches the independent Dakota terrain reference');
});

test('Snow Town spawn routes match the independent APK route graph and stay on route cells', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_42.tdm'));
  const grid = gridFrom(bytes);
  const actualRoutes = routeNodes(grid);
  const expectedRoutes = routeGraph.routes.map(({ actionId, nodes }) => ({
    actionId,
    nodes: nodes.map(([code, x, y]): RouteNode => [code, x, y]),
  }));

  assert.deepEqual(actualRoutes, expectedRoutes);
  const productionRoutes = dakota09RouteDefinitions.map((route) => {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    return {
      actionId: grid[route.spawn.cell.y]![route.spawn.cell.x]! - 40,
      nodes: cells.map(({ x, y }) => [grid[y]![x]!, x, y] as RouteNode),
    };
  });
  assert.deepEqual(productionRoutes, expectedRoutes, 'production Snow Town routes match the independent TDM expansion');
  assert.deepEqual(dakota09SpawnPointIdByActionId, { 0: 1, 1: 0, 2: 2 },
    'APK action IDs map through the row-major spawn list');
  assert.deepEqual(routeGraph.summary, {
    spawnCount: 3,
    redirectCount: 33,
    exitCount: 2,
    uniqueDirectedEdgeCount: 36,
    completeSpawnToExitPathCount: 3,
    intermediateCellVisits: 193,
    uniqueIntermediateRouteCells: 172,
    intermediateVisitsByRawTile: {
      32: 141, 52: 5, 53: 12, 54: 6, 55: 13, 80: 3, 81: 2, 88: 11,
    },
  });

  const actualControlNodes = grid.flatMap((row, y) => row.flatMap((code, x) => (
    (code >= 40 && code <= 46) || code === 48 || (code >= 52 && code <= 65)
      ? [[code, x, y] as const]
      : []
  )));
  const routedControlNodes = [...new Map(actualRoutes.flatMap(({ nodes }) => nodes)
    .map((node) => [`${node[0]},${node[1]},${node[2]}`, node] as const)).values()];
  assert.deepEqual(routedControlNodes.sort((a, b) => a[2] - b[2] || a[1] - b[1]), actualControlNodes);

  const routeStats = intermediateRouteStats(actualRoutes, grid);
  assert.deepEqual(routeStats, {
    uniqueDirectedEdgeCount: routeGraph.summary.uniqueDirectedEdgeCount,
    intermediateCellVisits: routeGraph.summary.intermediateCellVisits,
    uniqueIntermediateRouteCells: routeGraph.summary.uniqueIntermediateRouteCells,
    intermediateVisitsByRawTile: routeGraph.summary.intermediateVisitsByRawTile,
  });

  assert.deepEqual(actualRoutes.map(({ actionId }) => actionId), [1, 0, 2]);
  assert.deepEqual(actualRoutes.map(({ nodes }) => nodes.at(-1)), [
    [48, 31, 17], [48, 31, 16], [48, 31, 17],
  ]);
});
