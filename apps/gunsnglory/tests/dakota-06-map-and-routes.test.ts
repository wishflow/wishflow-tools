import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-06.json';
import { createDakotaBackgroundCollisionCodes } from '../src/content/dakota-background-collision';
import { dakota06RouteDefinitions, dakota06SpawnPointIdByActionId } from '../src/content/dakota-06-routes';
import { createDakota06MapScene } from '../src/content/dakota-06-scene';
import type { Direction, PreviewWaveDefinition } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import routeGraph from './fixtures/ice-rocks-route-graph.json';
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
  return dakota06RouteDefinitions.map((route) => {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    return {
      actionId: map.originalTileGrid[route.spawn.cell.y]![route.spawn.cell.x]! - 40,
      nodes: cells.map(({ x, y }) => [map.originalTileGrid[y]![x]!, x, y] as const),
    };
  });
}

function createRoutePreview(): PreviewWaveDefinition {
  const routes = dakota06RouteDefinitions;
  const uniqueSpawns = [...new Map(routes.map(({ spawn }) => [
    `${spawn.cell.x},${spawn.cell.y}:${spawn.direction}`, spawn,
  ])).values()];
  const exits = [...new Map(routes.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()];
  const first = routes[0]!;
  return {
    number: 1,
    initialLives: 25,
    initialCash: 200,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 56, medium: 75, hard: 125 },
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

test('Ice Rocks TDM39 bytes and 768 raw cells match the APK fixture', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_39.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'ice-rocks');
  assert.equal(map.source.resource, 'res/raw/td_map_39.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 344, 16: 65, 32: 128, 36: 63, 40: 1, 41: 1, 42: 1, 48: 2,
    52: 11, 53: 11, 54: 18, 55: 4, 56: 1, 61: 2, 69: 13, 70: 4, 71: 5,
    72: 1, 76: 3, 80: 6, 88: 21, 96: 18, 97: 8, 98: 5, 99: 8, 100: 1,
    101: 6, 102: 1, 104: 2, 105: 2, 110: 1, 112: 1, 113: 1, 114: 1,
    116: 1, 117: 2, 124: 3, 130: 1, 131: 1,
  });
});

test('Ice Rocks Dakota draw layers and background collision match the TDM-derived reference', () => {
  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 768);
  assert.equal(map.map.streets.length, 105);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))]
    .sort().map((asset) => [asset, map.map.streets.filter((tile) => tile.asset === asset).length])), {
    tiles_bridge_hori: 6,
    tiles_bridge_pier_left: 5,
    tiles_bridge_pier_right: 5,
    tiles_bridge_verti: 21,
    tiles_path: 35,
    tiles_path_var: 33,
  });

  const expectedCollision = deriveOriginalBackgroundCodesForTest(map);
  const actualCollision = createDakotaBackgroundCollisionCodes(map.map);
  assert.deepEqual(actualCollision, expectedCollision);
  assert.deepEqual(createDakota06MapScene().backgroundCollisionCodes, expectedCollision);

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

test('Ice Rocks spawn actions, all routes, directed control edges, and road cells match the static APK fixture', () => {
  assert.deepEqual(routeGraph.dimensions, [32, 24]);
  assert.equal(routeGraph.resource, map.source.resource);
  assert.deepEqual(routeGraph.summary, {
    spawnCount: 3,
    redirectCount: 47,
    exitCount: 2,
    edgeCount: 53,
    pathCount: 8,
    intermediateCellVisits: 460,
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
  assert.equal(actualRoutes.length, routeGraph.summary.pathCount);
  assert.deepEqual(sortedJson(actualRoutes), sortedJson(staticRoutes));

  const rowMajorSpawns = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [{ actionId: code - 40, cell: [x, y] as const }] : []
  )));
  assert.deepEqual(dakota06SpawnPointIdByActionId, { 2: 0, 1: 1, 0: 2 });
  assert.deepEqual(rowMajorSpawns.map(({ actionId }, spawnPointId) => [actionId, spawnPointId]), [[2, 0], [1, 1], [0, 2]]);

  const uniqueEdges = routeEdges(actualRoutes);
  assert.equal(uniqueEdges.length, routeGraph.summary.edgeCount);
  assert.deepEqual(uniqueEdges, routeEdges(staticRoutes));

  let intermediateCellVisits = 0;
  for (const route of dakota06RouteDefinitions) {
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    const targets = [...route.redirects, { cell: route.exit, directions: [] as readonly Direction[] }];
    for (const target of targets) {
      const dx = target.cell.x - current.x;
      const dy = target.cell.y - current.y;
      const steps = Math.abs(dx) + Math.abs(dy);
      assert.ok(steps > 0 && (dx === 0 || dy === 0), 'route control edge is a nonempty straight segment');
      assert.equal(directionByDelta[`${Math.sign(dx)},${Math.sign(dy)}`], direction, 'route follows the APK turn direction');
      for (let step = 1; step < steps; step += 1) {
        const x = current.x + Math.sign(dx) * step;
        const y = current.y + Math.sign(dy) * step;
        const code = map.originalTileGrid[y]![x]!;
        assert.ok(code === 32 || code === 80 || code === 88, `route interior ${x},${y} stays on an APK road/bridge tile, not raw ${code}`);
        intermediateCellVisits += 1;
      }
      current = target.cell;
      if (target.directions.length > 0) direction = target.directions[0]!;
    }
  }
  assert.equal(intermediateCellVisits, routeGraph.summary.intermediateCellVisits);
});

test('Ice Rocks runtime redirects retain all APK direction markers', () => {
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 52 && code <= 65 ? [`${x},${y}:${directionsByAction[code - 52]!.join('/')}`] : []
  ))).sort();
  const actual = runtimeWaveRedirects(createRoutePreview(), map.originalTileGrid)
    .map(({ cell, directions }) => `${cell.x},${cell.y}:${directions.join('/')}`).sort();
  assert.deepEqual(actual, expected);
});
