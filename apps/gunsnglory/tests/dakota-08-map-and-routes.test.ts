import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-08.json';
import { createDakotaBackgroundCollisionCodes } from '../src/content/dakota-background-collision';
import {
  dakota08RouteDefinitions,
  dakota08SpawnPointIdByActionId,
} from '../src/content/dakota-08-routes';
import { createDakota08MapScene } from '../src/content/dakota-08-scene';
import type { Direction, PreviewWaveDefinition } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import routeGraph from './fixtures/wayne-waters-route-graph.json';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const directionByDelta: Readonly<Record<string, Direction>> = {
  '0,-1': 'north', '0,1': 'south', '-1,0': 'west', '1,0': 'east',
};
const directionsByAction: readonly (readonly Direction[])[] = [
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
];

type RouteNode = readonly [code: number, x: number, y: number];

const staticRoutes = routeGraph.routes.map(({ actionId, nodes }) => ({
  actionId,
  nodes: nodes.map((node): RouteNode => [node[0]!, node[1]!, node[2]!]),
}));

function sortedJson(values: readonly unknown[]): string[] {
  return values.map((value) => JSON.stringify(value)).sort();
}

function expectedNodesFromRoutes(): RouteNode[] {
  return [...new Map(staticRoutes.flatMap(({ nodes }) => nodes)
    .map((node) => [`${node[0]}:${node[1]},${node[2]}`, node] as const)).values()];
}

function routeEdges(routes: readonly { nodes: readonly RouteNode[] }[]): string[] {
  return [...new Set(routes.flatMap(({ nodes }) => nodes.slice(1).map((to, index) => {
    const from = nodes[index]!;
    const delta = `${Math.sign(to[1] - from[1])},${Math.sign(to[2] - from[2])}`;
    const direction = directionByDelta[delta];
    assert.ok(direction, `control edge ${from[1]},${from[2]} to ${to[1]},${to[2]} is axis-aligned`);
    return `${from[1]},${from[2]}:${direction}->${to[1]},${to[2]}`;
  })))].sort();
}

function actualControlRoutes(): { actionId: number; nodes: RouteNode[] }[] {
  return dakota08RouteDefinitions.map((route) => {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    return {
      actionId: map.originalTileGrid[route.spawn.cell.y]![route.spawn.cell.x]! - 40,
      nodes: cells.map(({ x, y }) => [map.originalTileGrid[y]![x]!, x, y] as const),
    };
  });
}

function createRoutePreview(): PreviewWaveDefinition {
  const routes = dakota08RouteDefinitions;
  const uniqueSpawns = [...new Map(routes.map(({ spawn }) => [
    `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
  ])).values()];
  const exits = [...new Map(routes.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];
  const first = routes[0]!;
  return {
    number: 1,
    initialLives: 25,
    initialCash: 250,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 100 },
    enemy: {
      hitPoints: 1,
      cashReward: 0,
      penetration: { light: 0, fire: 0, heavy: 0, poison: 0 },
    },
    spawn: uniqueSpawns[0]!,
    additionalSpawns: uniqueSpawns.slice(1),
    routes,
    baseEnemySpeed: 500,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: first.redirects,
    exit: first.exit,
    additionalExits: exits.slice(1),
  };
}

test('Wayne Waters TDM41 bytes and 768 raw cells match the APK fixture', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_41.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(
    bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32)),
  ));

  assert.equal(map.id, 'wayne-waters');
  assert.equal(map.source.resource, 'res/raw/td_map_41.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 332, 16: 42, 32: 131, 36: 44, 40: 1, 41: 1, 42: 1, 43: 1, 48: 4,
    53: 24, 54: 9, 55: 11, 60: 1, 61: 1, 69: 7, 70: 4, 71: 6, 74: 1,
    76: 6, 78: 9, 80: 8, 88: 11, 96: 15, 97: 11, 98: 9, 99: 4, 100: 1,
    101: 5, 102: 4, 110: 4, 112: 1, 113: 1, 120: 1, 121: 2, 123: 1,
    124: 36, 125: 14, 126: 2, 130: 1, 131: 1,
  });
});

test('Wayne Waters Dakota draw layers and final background collision match the independent TDM reference', () => {
  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 768);
  assert.equal(map.map.streets.length, 71);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))]
    .sort().map((asset) => [asset, map.map.streets.filter((tile) => tile.asset === asset).length])), {
    tiles_bridge_hori: 8,
    tiles_bridge_pier_left: 4,
    tiles_bridge_pier_right: 4,
    tiles_bridge_verti: 11,
    tiles_path: 20,
    tiles_path_var: 24,
  });

  const expectedCollision = deriveOriginalBackgroundCodesForTest(map);
  assert.deepEqual(createDakotaBackgroundCollisionCodes(map.map), expectedCollision);
  assert.deepEqual(createDakota08MapScene().backgroundCollisionCodes, expectedCollision);
  for (const row of map.map.background) {
    assert.ok(row.x >= 0 && row.x < 32 && row.y >= 0 && row.y < 24);
  }
  const tiles = [...map.map.background, ...map.map.streets];
  for (const asset of new Set(tiles.map(({ asset }) => asset))) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} is bundled`);
    const png = readFileSync(assetPath);
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${asset} is a PNG`);
    const width = png.readUInt32BE(16) / gameAssetSourceScale(asset);
    const height = png.readUInt32BE(20) / gameAssetSourceScale(asset);
    for (const tile of tiles.filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= width, `${asset} source x-range is inside its atlas`);
      assert.ok(tile.source.y + tile.source.height <= height, `${asset} source y-range is inside its atlas`);
    }
  }
});

test('Wayne Waters spawn actions, all routes, directed edges, and road cells match the static APK fixture', () => {
  assert.deepEqual(routeGraph.dimensions, [32, 24]);
  assert.equal(routeGraph.resource, map.source.resource);
  assert.deepEqual(routeGraph.summary, {
    spawnCount: 4,
    redirectCount: 46,
    exitCount: 4,
    uniqueDirectedEdgeCount: 52,
    completeSpawnToExitPathCount: 6,
    intermediateCellVisits: 214,
    uniqueIntermediateRouteCells: 167,
    intermediateVisitsByRawTile: { '32': 139, '53': 30, '54': 11, '55': 13, '60': 2, '61': 2, '80': 12, '88': 5 },
  });

  const actualNodes = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    if (code >= 40 && code <= 46) return [[1, code - 40, x, y]];
    if (code >= 52 && code <= 65) return [[2, code - 52, x, y]];
    if (code === 48) return [[3, 0, x, y]];
    return [];
  }));
  const expectedNodes = expectedNodesFromRoutes().map(([code, x, y]) => {
    if (code >= 40 && code <= 46) return [1, code - 40, x, y];
    if (code >= 52 && code <= 65) return [2, code - 52, x, y];
    return [3, 0, x, y];
  });
  assert.deepEqual(sortedJson(actualNodes), sortedJson(expectedNodes));

  const actualRoutes = actualControlRoutes();
  assert.equal(actualRoutes.length, routeGraph.summary.completeSpawnToExitPathCount);
  assert.deepEqual(sortedJson(actualRoutes), sortedJson(staticRoutes));

  const rowMajorActions = map.originalTileGrid.flatMap((row) => row
    .filter((code) => code >= 40 && code <= 46)
    .map((code) => code - 40));
  assert.deepEqual(dakota08SpawnPointIdByActionId, { 1: 0, 2: 1, 3: 2, 0: 3 });
  assert.deepEqual(rowMajorActions.map((actionId, spawnPointId) => [actionId, spawnPointId]), [
    [1, 0], [2, 1], [3, 2], [0, 3],
  ]);

  const uniqueEdges = routeEdges(actualRoutes);
  assert.equal(uniqueEdges.length, routeGraph.summary.uniqueDirectedEdgeCount);
  assert.deepEqual(uniqueEdges, routeEdges(staticRoutes));

  let intermediateCellVisits = 0;
  const visitedRouteCells = new Set<string>();
  const visitsByRawTile: Record<string, number> = {};
  for (const route of dakota08RouteDefinitions) {
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    const targets = [...route.redirects, { cell: route.exit, directions: [] as readonly Direction[] }];
    for (const [targetIndex, target] of targets.entries()) {
      const dx = target.cell.x - current.x;
      const dy = target.cell.y - current.y;
      const steps = Math.abs(dx) + Math.abs(dy);
      assert.ok(steps > 0 && (dx === 0 || dy === 0), 'route control edge is a nonempty straight segment');
      assert.equal(directionByDelta[`${Math.sign(dx)},${Math.sign(dy)}`], direction, 'route follows the APK turn direction');
      for (let step = 1; step <= steps; step += 1) {
        if (targetIndex === targets.length - 1 && step === steps) continue;
        const x = current.x + Math.sign(dx) * step;
        const y = current.y + Math.sign(dy) * step;
        const code = map.originalTileGrid[y]![x]!;
        assert.ok(
          code === 32 || (code >= 53 && code <= 61) || code === 80 || code === 88,
          `route cell ${x},${y} is an APK road, bridge, or direction marker, not raw ${code}`,
        );
        intermediateCellVisits += 1;
        visitedRouteCells.add(`${x},${y}`);
        visitsByRawTile[code] = (visitsByRawTile[code] ?? 0) + 1;
      }
      current = target.cell;
      if (target.directions.length > 0) direction = target.directions[0]!;
    }
  }
  assert.equal(intermediateCellVisits, routeGraph.summary.intermediateCellVisits);
  assert.equal(visitedRouteCells.size, routeGraph.summary.uniqueIntermediateRouteCells);
  assert.deepEqual(visitsByRawTile, routeGraph.summary.intermediateVisitsByRawTile);

  const expectedRedirects = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 52 && code <= 65 ? [`${x},${y}:${directionsByAction[code - 52]!.join('/')}`] : []
  ))).sort();
  const actualRedirects = runtimeWaveRedirects(createRoutePreview(), map.originalTileGrid)
    .map(({ cell, directions }) => `${cell.x},${cell.y}:${directions.join('/')}`).sort();
  assert.deepEqual(actualRedirects, expectedRedirects);
});
