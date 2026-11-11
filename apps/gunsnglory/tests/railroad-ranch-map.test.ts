import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Direction, WaveRedirect, WaveRouteDefinition } from '../src/game';
import { createRailroadRanchDynamiteDefinition } from '../src/content/railroad-ranch-dynamite';
import {
  railroadRanchExits,
  railroadRanchRedirects,
  railroadRanchRouteDefinitions,
  railroadRanchSpawnPoints,
} from '../src/content/railroad-ranch-routes';
import { createRailroadRanchMapScene } from '../src/content/railroad-ranch-scene';
import { createRailroadRanchTrainUnits } from '../src/content/railroad-ranch-units';
import map from '../src/content/new-mexico-09.json';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const vectors: Readonly<Record<Direction, readonly [number, number]>> = {
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
  north: [0, -1],
};

/** APK-derived PriorityMap direction fields, with edge order preserved for seeded routing. */
const expectedRedirects: readonly WaveRedirect[] = [
  { cell: { x: 4, y: 1 }, directions: ['south'] },
  { cell: { x: 15, y: 1 }, directions: ['west', 'south'] },
  { cell: { x: 26, y: 1 }, directions: ['west'] },
  { cell: { x: 4, y: 5 }, directions: ['west'] },
  { cell: { x: 26, y: 6 }, directions: ['north', 'south'] },
  { cell: { x: 11, y: 7 }, directions: ['south'] },
  { cell: { x: 15, y: 7 }, directions: ['west'] },
  { cell: { x: 22, y: 7 }, directions: ['west'] },
  { cell: { x: 4, y: 8 }, directions: ['north'] },
  { cell: { x: 5, y: 8 }, directions: ['west'] },
  { cell: { x: 9, y: 8 }, directions: ['south'] },
  { cell: { x: 11, y: 8 }, directions: ['west'] },
  { cell: { x: 5, y: 11 }, directions: ['north', 'south'] },
  { cell: { x: 9, y: 11 }, directions: ['west'] },
  { cell: { x: 22, y: 11 }, directions: ['north', 'south'] },
  { cell: { x: 26, y: 11 }, directions: ['west'] },
  { cell: { x: 17, y: 13 }, directions: ['south'] },
  { cell: { x: 22, y: 13 }, directions: ['west'] },
  { cell: { x: 9, y: 14 }, directions: ['north'] },
  { cell: { x: 14, y: 14 }, directions: ['west'] },
  { cell: { x: 17, y: 14 }, directions: ['west'] },
  { cell: { x: 5, y: 16 }, directions: ['west'] },
  { cell: { x: 26, y: 17 }, directions: ['north', 'south'] },
  { cell: { x: 5, y: 20 }, directions: ['north'] },
  { cell: { x: 14, y: 20 }, directions: ['north', 'west'] },
  { cell: { x: 20, y: 20 }, directions: ['west'] },
  { cell: { x: 20, y: 21 }, directions: ['north'] },
  { cell: { x: 26, y: 21 }, directions: ['west'] },
];

const expectedSpawns = [
  { cell: { x: 31, y: 6 }, direction: 'west' },
  { cell: { x: 31, y: 17 }, direction: 'west' },
] as const;
const expectedExits = [{ x: 0, y: 5 }, { x: 0, y: 16 }] as const;

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

function expandRoute(route: WaveRouteDefinition): [number, number][] {
  const cells: [number, number][] = [[route.spawn.cell.x, route.spawn.cell.y]];
  let current = { ...route.spawn.cell };
  let direction = route.spawn.direction;

  for (const target of [...route.redirects, { cell: route.exit, directions: [] }]) {
    const [dx, dy] = vectors[direction];
    const deltaX = target.cell.x - current.x;
    const deltaY = target.cell.y - current.y;
    assert.ok(
      (deltaX === 0 || deltaY === 0) && Math.sign(deltaX) === dx && Math.sign(deltaY) === dy,
      'route continues ' + direction + ' from (' + current.x + ',' + current.y + ') to ('
        + target.cell.x + ',' + target.cell.y + ')',
    );
    while (current.x !== target.cell.x || current.y !== target.cell.y) {
      current = { x: current.x + dx, y: current.y + dy };
      cells.push([current.x, current.y]);
    }
    if (target.directions.length > 0) direction = target.directions[0]!;
  }

  return cells;
}

function routeSignature(route: WaveRouteDefinition): string {
  const redirects = route.redirects.map(({ cell, directions }) => (
    String(cell.x) + ',' + cell.y + ':' + directions.join(',')
  )).join(';');
  return route.spawn.cell.x + ',' + route.spawn.cell.y + ':' + route.spawn.direction
    + '>' + redirects + '>' + route.exit.x + ',' + route.exit.y;
}

function enumerateRoutesFromStaticGraph(): WaveRouteDefinition[] {
  const graph = new Map(expectedRedirects.map(({ cell, directions }) => [
    String(cell.x) + ',' + cell.y,
    directions,
  ]));
  const routes: WaveRouteDefinition[] = [];

  const follow = (
    spawn: WaveRouteDefinition['spawn'],
    cell: { x: number; y: number },
    direction: Direction,
    redirects: WaveRedirect[],
    visited: ReadonlySet<string>,
  ): void => {
    let current = { ...cell };
    const [dx, dy] = vectors[direction];

    for (let steps = 0; steps < 96; steps += 1) {
      current = { x: current.x + dx, y: current.y + dy };
      assert.ok(
        current.x >= 0 && current.x < map.map.width && current.y >= 0 && current.y < map.map.height,
        'static route stays in bounds at (' + current.x + ',' + current.y + ')',
      );

      const exit = expectedExits.find(({ x, y }) => x === current.x && y === current.y);
      if (exit) {
        routes.push({ spawn, redirects, exit });
        return;
      }

      const directions = graph.get(String(current.x) + ',' + current.y);
      if (!directions) continue;

      const key = String(current.x) + ',' + current.y;
      assert.equal(visited.has(key), false, 'static route graph has no cycle at ' + key);
      const nextVisited = new Set(visited).add(key);
      for (const nextDirection of directions) {
        follow(
          spawn,
          current,
          nextDirection,
          [...redirects, { cell: current, directions: [nextDirection] }],
          nextVisited,
        );
      }
      return;
    }

    assert.fail('static route from (' + spawn.cell.x + ',' + spawn.cell.y + ') did not reach an exit');
  };

  for (const spawn of expectedSpawns) follow(spawn, spawn.cell, spawn.direction, [], new Set());
  return routes;
}

function cellKey(cell: { x: number; y: number }): string {
  return String(cell.x) + ',' + cell.y;
}

test('maps both APK spawn markers and both exits to the original cells', () => {
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 40), [[31, 6]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 41), [[31, 17]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 48), [[0, 5], [0, 16]]);
  assert.deepEqual(railroadRanchSpawnPoints, expectedSpawns);
  assert.deepEqual(railroadRanchExits, expectedExits);
});

test('preserves all 28 APK direction nodes, 36 ordered edges, and all 14 legal paths', () => {
  assert.deepEqual(railroadRanchRedirects, expectedRedirects);
  assert.equal(railroadRanchRedirects.length, 28);
  const redirectEdges = railroadRanchRedirects.reduce((total, redirect) => total + redirect.directions.length, 0);
  assert.equal(redirectEdges, 34);
  assert.equal(redirectEdges + expectedSpawns.length, 36, 'the graph edge total includes both spawn-to-redirect edges');

  const markerCoordinates = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 52 && code <= 65 ? [{ x, y }] : []
  )));
  assert.deepEqual(markerCoordinates.map(cellKey), expectedRedirects.map(({ cell }) => cellKey(cell)));

  const expectedRoutes = enumerateRoutesFromStaticGraph();
  assert.equal(expectedRoutes.length, 14);
  assert.equal(railroadRanchRouteDefinitions.length, 14);
  assert.equal(new Set(railroadRanchRouteDefinitions.map(routeSignature)).size, 14);
  assert.deepEqual(
    railroadRanchRouteDefinitions.map(routeSignature).sort(),
    expectedRoutes.map(routeSignature).sort(),
  );

  const routeCounts = new Map<string, number>();
  const exitCounts = new Map<string, number>();
  for (const route of railroadRanchRouteDefinitions) {
    const spawnKey = cellKey(route.spawn.cell);
    const exitKey = cellKey(route.exit);
    routeCounts.set(spawnKey, (routeCounts.get(spawnKey) ?? 0) + 1);
    exitCounts.set(spawnKey + '>' + exitKey, (exitCounts.get(spawnKey + '>' + exitKey) ?? 0) + 1);

    for (const [x, y] of expandRoute(route)) {
      assert.ok(x >= 0 && x < map.map.width && y >= 0 && y < map.map.height, 'route cell (' + x + ',' + y + ') is inside map');
    }
  }

  assert.deepEqual(Object.fromEntries(routeCounts), { '31,6': 7, '31,17': 7 });
  assert.deepEqual(Object.fromEntries(exitCounts), {
    '31,6>0,5': 4,
    '31,6>0,16': 3,
    '31,17>0,5': 3,
    '31,17>0,16': 4,
  });
});

test('maps all 57 static scenery markers to existing assets and original cells', () => {
  const scene = createRailroadRanchMapScene();
  const assetByCode: Readonly<Record<number, string>> = {
    68: 'e_1x1_cactus_a',
    69: 'e_1x1_rocks_a',
    70: 'e_1x1_rocks_b',
    71: 'e_1x1_tree',
    72: 'b_1x1_stake',
    73: 'e_1x1_cactus_b',
    74: 'b_1x1_windmill',
    75: 'b_1x1_watertower',
    76: 'e_1x1_bush',
    77: 'e_1x2_bones',
    116: 'b_2x1_shack',
    117: 'b_1x1_tipi_small',
  };
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    assetByCode[code] ? [{ asset: assetByCode[code]!, cell: { x, y } }] : []
  )));
  const decorations = scene.decorations ?? [];

  assert.equal(decorations.length, 57);
  assert.deepEqual(decorations.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 116), [[30, 8]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 117), [[18, 22]]);

  const stake = decorations.find(({ asset }) => asset === 'b_1x1_stake');
  assert.deepEqual(stake?.collisionBoxFine, { x: 1920, y: 2612, width: 3840, height: 2534 });
  const shack = decorations.find(({ asset }) => asset === 'b_2x1_shack');
  assert.equal(shack?.anchorOffsetX, -0.5);
  assert.deepEqual(shack?.collisionBoxFine, { x: -3840, y: -1228, width: 15360, height: 3840 });

  for (const decoration of decorations) {
    assert.ok(decoration.cell.x >= 0 && decoration.cell.x < map.map.width);
    assert.ok(decoration.cell.y >= 0 && decoration.cell.y < map.map.height);
    assert.ok(
      existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(decoration.asset))),
      decoration.asset + ' scenery asset exists',
    );
  }
});

test('creates six independent train groups with original components, cells, and activities', () => {
  const units = createRailroadRanchTrainUnits();
  const groupIds = [...new Set(units.map(({ movementGroupId }) => movementGroupId))].sort();
  assert.equal(units.length, 25);
  assert.deepEqual(groupIds, [
    'railroad-ranch-horizontal-train-1',
    'railroad-ranch-horizontal-train-2',
    'railroad-ranch-horizontal-train-3',
    'railroad-ranch-vertical-train-1',
    'railroad-ranch-vertical-train-2',
    'railroad-ranch-vertical-train-3',
  ]);
  assert.equal(units.filter(({ activity }) => activity === 4).length, 11);
  assert.equal(units.filter(({ activity }) => activity === 5).length, 14);

  const expectedGroups: Readonly<Record<string, readonly (readonly [string, number, string, number, number, string])[]>> = {
    'railroad-ranch-horizontal-train-1': [
      ['train-10', 5, 'lok_hori_1of2', 17, 3, 'horizontal'],
      ['train-11', 5, 'lok_hori_2of2', 18, 3, 'horizontal'],
      ['train-12', 4, 'lok_wagon_hori', 19, 3, 'horizontal'],
      ['train-12', 4, 'lok_wagon_hori', 20, 3, 'horizontal'],
    ],
    'railroad-ranch-horizontal-train-2': [
      ['train-10', 5, 'lok_hori_1of2', 13, 10, 'horizontal'],
      ['train-11', 5, 'lok_hori_2of2', 14, 10, 'horizontal'],
      ['train-12', 4, 'lok_wagon_hori', 15, 10, 'horizontal'],
      ['train-12', 4, 'lok_wagon_hori', 16, 10, 'horizontal'],
      ['train-12', 4, 'lok_wagon_hori', 17, 10, 'horizontal'],
    ],
    'railroad-ranch-horizontal-train-3': [
      ['train-10', 5, 'lok_hori_1of2', 16, 17, 'horizontal'],
      ['train-11', 5, 'lok_hori_2of2', 17, 17, 'horizontal'],
      ['train-12', 4, 'lok_wagon_hori', 18, 17, 'horizontal'],
      ['train-12', 4, 'lok_wagon_hori', 19, 17, 'horizontal'],
    ],
    'railroad-ranch-vertical-train-1': [
      ['train-22', 5, 'lok_wagon_verti', 2, 11, 'vertical'],
      ['train-22', 5, 'lok_wagon_verti', 2, 12, 'vertical'],
      ['train-20', 5, 'lok_verti_2of2', 2, 13, 'vertical'],
      ['train-21', 5, 'lok_verti_1of2', 2, 14, 'vertical'],
    ],
    'railroad-ranch-vertical-train-2': [
      ['train-22', 4, 'lok_wagon_verti', 24, 13, 'vertical'],
      ['train-22', 4, 'lok_wagon_verti', 24, 14, 'vertical'],
      ['train-20', 5, 'lok_verti_2of2', 24, 15, 'vertical'],
      ['train-21', 5, 'lok_verti_1of2', 24, 16, 'vertical'],
    ],
    'railroad-ranch-vertical-train-3': [
      ['train-22', 4, 'lok_wagon_verti', 7, 14, 'vertical'],
      ['train-22', 4, 'lok_wagon_verti', 7, 15, 'vertical'],
      ['train-20', 5, 'lok_verti_2of2', 7, 16, 'vertical'],
      ['train-21', 5, 'lok_verti_1of2', 7, 17, 'vertical'],
    ],
  };

  for (const [groupId, expected] of Object.entries(expectedGroups)) {
    const actual = units.filter(({ movementGroupId }) => movementGroupId === groupId).map(({
      type, activity, asset, cell, movementAxis,
    }) => [type, activity, asset, cell.x, cell.y, movementAxis]);
    assert.deepEqual(actual, expected, groupId);
  }

  for (const asset of new Set(units.map(({ asset }) => asset!))) {
    assert.ok(
      existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))),
      asset + ' train asset exists',
    );
  }
});

test('pairs four original dynamite triggers and boxes and preserves the existing unlock gate', () => {
  const locked = createRailroadRanchDynamiteDefinition([]);
  assert.deepEqual(locked, {
    unlocked: false,
    pairs: [
      { id: 'dynamite-1', triggerCell: { x: 5, y: 4 }, boxCell: { x: 5, y: 6 } },
      { id: 'dynamite-2', triggerCell: { x: 10, y: 5 }, boxCell: { x: 10, y: 7 } },
      { id: 'dynamite-3', triggerCell: { x: 19, y: 15 }, boxCell: { x: 19, y: 14 } },
      { id: 'dynamite-4', triggerCell: { x: 10, y: 22 }, boxCell: { x: 10, y: 21 } },
    ],
  });
  assert.deepEqual(createRailroadRanchDynamiteDefinition(['campaign-mississippi-10']), {
    unlocked: true,
    pairs: locked.pairs,
  });
});
