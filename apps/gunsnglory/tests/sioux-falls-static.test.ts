import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-10.json';
import { dakota10RouteDefinitions, dakota10SpawnPointIdByActionId } from '../src/content/dakota-10-routes';
import { createDakota10MapScene } from '../src/content/dakota-10-scene';
import {
  createPlayerMapCollisionBoxes,
  PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE,
} from '../src/game/player-collision-geometry';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import routeGraph from './fixtures/sioux-falls-route-graph.json';
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

function traceOriginalTdmRoutes(grid: readonly (readonly number[])[]) {
  const height = grid.length;
  const width = grid[0]!.length;
  const directionActions: readonly (readonly string[])[] = [
    ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
    ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
    ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
    ['south', 'north', 'west'],
  ];
  const vectorByDirection: Readonly<Record<string, readonly [number, number]>> = {
    north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0],
  };
  const fields = new Map<string, number>();
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const code = grid[y]![x]!;
      if ((code >= 40 && code <= 46) || code === 48 || (code >= 52 && code <= 65)) {
        fields.set(`${x},${y}`, code);
      }
    }
  }

  const initialDirection = (x: number, y: number): string => {
    if (x >= width - 1) return 'west';
    if (x === 0) return 'east';
    if (y >= height - 1) return 'north';
    if (y === 0) return 'south';
    throw new Error(`APK spawn marker at (${x},${y}) is not on a map border`);
  };
  const traceFrom = (
    spawn: readonly [number, number, number],
    current: readonly [number, number],
    direction: string,
    nodes: readonly (readonly [number, number])[],
    visited: ReadonlySet<string>,
  ): { actionId: number; nodes: RouteNode[] }[] => {
    const vector = vectorByDirection[direction];
    assert.ok(vector, `APK direction ${direction} has a movement vector`);
    let [x, y] = current;
    while (true) {
      x += vector[0];
      y += vector[1];
      assert.ok(x >= 0 && y >= 0 && x < width && y < height,
        `original route from (${spawn[0]},${spawn[1]}) remains inside the TDM`);
      const key = `${x},${y}`;
      const code = fields.get(key);
      if (code === undefined || code !== 48 && (code < 52 || code > 65)) continue;
      const nextNodes = [...nodes, [x, y] as const];
      if (code === 48) {
        return [{ actionId: spawn[2] - 40, nodes: nextNodes.map(([nodeX, nodeY]) => (
          [grid[nodeY]![nodeX]!, nodeX, nodeY]
        )) }];
      }
      assert.equal(visited.has(key), false, `original route does not cycle at ${key}`);
      const actions = directionActions[code - 52];
      assert.ok(actions, `raw marker ${code} has a native direction table`);
      return actions.flatMap((nextDirection) => traceFrom(
        spawn,
        [x, y],
        nextDirection,
        nextNodes,
        new Set(visited).add(key),
      ));
    }
  };

  const routes: { actionId: number; nodes: RouteNode[] }[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const code = grid[y]![x]!;
      if (code < 40 || code > 46) continue;
      routes.push(...traceFrom([x, y, code], [x, y], initialDirection(x, y), [[x, y]], new Set([`${x},${y}`])));
    }
  }
  return routes;
}

function routeStats(routes: readonly { nodes: readonly RouteNode[] }[], grid: readonly (readonly number[])[]) {
  const directionByDelta: Readonly<Record<string, string>> = {
    '0,-1': 'north', '0,1': 'south', '-1,0': 'west', '1,0': 'east',
  };
  const edges = new Set<string>();
  const cells = new Set<string>();
  const visitsByCode: Record<string, number> = {};
  let visits = 0;

  for (const route of routes) {
    for (let index = 0; index < route.nodes.length - 1; index += 1) {
      const from = route.nodes[index]!;
      const to = route.nodes[index + 1]!;
      const dx = Math.sign(to[1] - from[1]);
      const dy = Math.sign(to[2] - from[2]);
      const direction = directionByDelta[`${dx},${dy}`];
      assert.ok(direction, `route edge from ${from[1]},${from[2]} to ${to[1]},${to[2]} is axis aligned`);
      edges.add(`${from[1]},${from[2]}:${direction}->${to[1]},${to[2]}`);

      const distance = Math.abs(to[1] - from[1]) + Math.abs(to[2] - from[2]);
      for (let step = 1; step <= distance; step += 1) {
        if (to[0] === 48 && step === distance) continue;
        const x = from[1] + (dx * step);
        const y = from[2] + (dy * step);
        const code = grid[y]![x]!;
        assert.ok(
          code === 32 || (code >= 52 && code <= 65) || (code >= 80 && code <= 95),
          `route cell ${x},${y} stays on an APK road, bridge, railway crossing, or direction marker; found ${code}`,
        );
        visits += 1;
        cells.add(`${x},${y}`);
        visitsByCode[String(code)] = (visitsByCode[String(code)] ?? 0) + 1;
      }
    }
  }

  return {
    spawnCount: new Set(routes.map(({ nodes }) => `${nodes[0]![1]},${nodes[0]![2]}`)).size,
    redirectCount: new Set(routes.flatMap(({ nodes }) => nodes
      .filter(([code]) => code >= 52 && code <= 65)
      .map(([, x, y]) => `${x},${y}`))).size,
    exitCount: new Set(routes.map(({ nodes }) => `${nodes.at(-1)![1]},${nodes.at(-1)![2]}`)).size,
    uniqueDirectedEdgeCount: edges.size,
    completeSpawnToExitPathCount: routes.length,
    intermediateCellVisits: visits,
    uniqueIntermediateRouteCells: cells.size,
    intermediateVisitsByRawTile: Object.fromEntries(Object.entries(visitsByCode)
      .sort(([left], [right]) => Number(left) - Number(right))),
  };
}

function markerCells(marker: number): number[][] {
  return map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => code === marker ? [[x, y]] : []));
}

test('Sioux Falls TDM fixture preserves all APK bytes, dimensions, and marker frequencies', () => {
  const fixture = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_43.tdm'));
  const publicMap = readFileSync(path.join(appRoot, 'public/content/maps/td_map_43.tdm'));
  assert.equal(fixture.length, 770);
  assert.deepEqual([...fixture.subarray(0, 2)], [32, 24]);
  assert.deepEqual(publicMap, fixture, 'the served TDM is byte-identical to the research fixture');

  const grid = gridFrom(fixture);
  assert.equal(routeGraph.resource, 'res/raw/td_map_43.tdm');
  assert.deepEqual(routeGraph.dimensions, [32, 24]);
  assert.deepEqual(map.originalTileGrid, grid, 'the web grid preserves every source TDM cell');
  assert.equal(map.id, 'sioux-falls');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);

  const allCodes = grid.flat();
  assert.deepEqual(Object.fromEntries([...new Set(allCodes)].sort((a, b) => a - b).map((code) => [
    code,
    allCodes.filter((value) => value === code).length,
  ])), {
    0: 341, 16: 47, 32: 107, 36: 48, 40: 1, 41: 1, 42: 1, 43: 1, 44: 1, 48: 2,
    52: 3, 53: 11, 54: 3, 55: 12, 57: 1, 61: 1, 69: 2, 70: 3, 71: 3, 72: 1, 76: 3,
    78: 7, 80: 8, 88: 13, 89: 3, 90: 9, 91: 2, 92: 3, 94: 1, 95: 1, 96: 11, 97: 9,
    98: 6, 99: 8, 101: 5, 102: 1, 108: 1, 110: 1, 112: 1, 113: 1, 114: 1, 116: 4,
    117: 2, 120: 1, 121: 2, 123: 1, 124: 45, 125: 22, 126: 4, 130: 1, 131: 1,
  });
});

test('Sioux Falls background, path, bridge, and rail layers match APK-derived draw commands', () => {
  const expected = deriveOriginalTdmMapDrawCommands({ originalTileGrid: map.originalTileGrid });
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 32 * 24);
  assert.deepEqual(Object.fromEntries([...new Set(map.map.streets.map(({ asset }) => asset))].sort().map((asset) => [
    asset,
    map.map.streets.filter((tile) => tile.asset === asset).length,
  ])), {
    tiles_bridge_hori: 8,
    tiles_bridge_pier_left: 6,
    tiles_bridge_pier_right: 6,
    tiles_bridge_verti: 13,
    tiles_path: 25,
    tiles_path_var: 25,
    tiles_railway_verti: 17,
  });
  assert.deepEqual(createDakota10MapScene().backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map),
    'the collision surface derives from the same APK terrain mapping as the independent reference');

  for (const asset of new Set([...map.map.background, ...map.map.streets].map(({ asset }) => asset))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }
});

test('Sioux Falls route branches match an independent TDM trace and remain on authored route surfaces', () => {
  const fixture = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_43.tdm'));
  const grid = gridFrom(fixture);
  const expectedRoutes = routeGraph.routes.map(({ actionId, nodes }) => ({
    actionId,
    nodes: nodes.map(([code, x, y]): RouteNode => [code, x, y]),
  }));
  const actualRoutes = traceOriginalTdmRoutes(grid);
  assert.deepEqual(actualRoutes, expectedRoutes);

  const productionRoutes = dakota10RouteDefinitions.map((route) => {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    return {
      actionId: grid[route.spawn.cell.y]![route.spawn.cell.x]! - 40,
      nodes: cells.map(({ x, y }) => [grid[y]![x]!, x, y] as RouteNode),
    };
  });
  assert.deepEqual(productionRoutes, expectedRoutes);
  assert.deepEqual(dakota10SpawnPointIdByActionId, { 0: 1, 1: 0, 2: 3, 3: 4, 4: 2 });

  const controls = grid.flatMap((row, y) => row.flatMap((code, x) => (
    (code >= 40 && code <= 46) || code === 48 || (code >= 52 && code <= 65) ? [[code, x, y]] : []
  )));
  const routedControls = [...new Map(actualRoutes.flatMap(({ nodes }) => nodes)
    .map((node) => [`${node[0]},${node[1]},${node[2]}`, node] as const)).values()]
    .sort((left, right) => left[2] - right[2] || left[1] - right[1]);
  assert.deepEqual(routedControls, controls, 'all spawn, branch, turn, and exit markers belong to a complete path');

  const stats = routeStats(actualRoutes, grid);
  assert.deepEqual(stats, routeGraph.summary);
  assert.deepEqual(actualRoutes.map(({ actionId }) => actionId), [1, 1, 0, 0, 4, 4, 2, 2, 3]);
  assert.deepEqual(actualRoutes.map(({ nodes }) => nodes.at(-1)), [
    [48, 31, 12], [48, 31, 12], [48, 31, 12], [48, 31, 12], [48, 31, 11],
    [48, 31, 12], [48, 31, 12], [48, 31, 12], [48, 31, 12],
  ]);
});

test('Sioux Falls APK object markers create the correct Dakota decorations and blockers', () => {
  const scene = createDakota10MapScene();
  const assetByCode: Readonly<Record<number, string>> = {
    69: 'e_1x1_rocks_snow_a', 70: 'e_1x1_rocks_snow_b', 71: 'e_1x1_tree_snow',
    72: 'b_1x1_stake', 76: 'e_1x1_bush',
    94: 'tiles_railway_buffers_verti_up', 95: 'tiles_railway_buffers_verti_down',
    112: 'b_3x2_saloon', 113: 'b_3x2_fort', 114: 'b_2x1_tipi',
    116: 'b_2x1_shack', 117: 'b_1x1_tipi_small', 126: 'e_1x1_rocks_water',
  };
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    assetByCode[code] ? [{ asset: assetByCode[code]!, cell: { x, y } }] : []
  )));
  assert.deepEqual(scene.decorations?.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.equal(scene.decorations?.length, 27);
  assert.equal(scene.decorations?.some(({ asset }) => asset.startsWith('lok_')), false,
    'waterborne Steamer parts are units, not duplicate static scenery');
  assert.equal(scene.decorations?.some(({ cell }) => map.originalTileGrid[cell.y]?.[cell.x] === 78), false,
    'raw marker 78 has no native map object');

  const boxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations ?? [], undefined);
  const staticMarkers = Object.keys(PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE).map(Number);
  for (let y = 0; y < map.originalTileGrid.length; y += 1) {
    for (let x = 0; x < map.originalTileGrid[y]!.length; x += 1) {
      const code = map.originalTileGrid[y]![x]!;
      const bounds = PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE[code];
      if (!bounds) continue;
      assert.ok(staticMarkers.includes(code));
      assert.deepEqual(boxes.filter((box) => box.sourceTdmCode === code
        && box.sourceCell?.x === x && box.sourceCell.y === y), [{
        x: (x * 7_680) + bounds.x,
        y: (y * 7_680) + bounds.y,
        width: bounds.width,
        height: bounds.height,
        sourceCell: { x, y },
        sourceTdmCode: code,
      }], `raw TDM ${code} at (${x},${y}) gets the APK blocker geometry`);
    }
  }

  for (const asset of new Set((scene.decorations ?? []).map(({ asset }) => asset))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} exists`);
  }
  for (const tile of [...map.map.background, ...map.map.streets]) {
    const png = readFileSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(tile.asset)));
    const width = png.readUInt32BE(16) / gameAssetSourceScale(tile.asset);
    const height = png.readUInt32BE(20) / gameAssetSourceScale(tile.asset);
    assert.ok(tile.source.x + tile.source.width <= width, `${tile.asset} source X crop is inside the atlas`);
    assert.ok(tile.source.y + tile.source.height <= height, `${tile.asset} source Y crop is inside the atlas`);
  }
});
