import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { Direction, WaveRedirect, WaveRouteDefinition } from '../src/game';
import {
  lostCityExits,
  lostCityRedirects,
  lostCityRouteDefinitions,
  lostCitySpawnPoints,
} from '../src/content/lost-city-routes';
import { createLostCityMapScene } from '../src/content/lost-city-scene';
import { createLostCityMapUnits, createLostCityTrainUnits } from '../src/content/lost-city-units';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import map from '../src/content/new-mexico-10.json';

const appRoot = path.resolve(import.meta.dirname, '..');
const vectors: Readonly<Record<Direction, readonly [number, number]>> = {
  east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1],
};

const expectedRedirects: readonly WaveRedirect[] = [
  { cell: { x: 7, y: 3 }, directions: ['south'] },
  { cell: { x: 9, y: 3 }, directions: ['west'] },
  { cell: { x: 10, y: 3 }, directions: ['east'] },
  { cell: { x: 14, y: 3 }, directions: ['south'] },
  { cell: { x: 15, y: 3 }, directions: ['south'] },
  { cell: { x: 18, y: 3 }, directions: ['west'] },
  { cell: { x: 19, y: 3 }, directions: ['east'] },
  { cell: { x: 22, y: 3 }, directions: ['south'] },
  { cell: { x: 3, y: 8 }, directions: ['south'] },
  { cell: { x: 7, y: 8 }, directions: ['west', 'east'] },
  { cell: { x: 11, y: 8 }, directions: ['south'] },
  { cell: { x: 14, y: 8 }, directions: ['west'] },
  { cell: { x: 15, y: 8 }, directions: ['east'] },
  { cell: { x: 18, y: 8 }, directions: ['south'] },
  { cell: { x: 22, y: 8 }, directions: ['west', 'east'] },
  { cell: { x: 24, y: 8 }, directions: ['south'] },
  { cell: { x: 2, y: 9 }, directions: ['south'] },
  { cell: { x: 3, y: 9 }, directions: ['west'] },
  { cell: { x: 24, y: 10 }, directions: ['east'] },
  { cell: { x: 26, y: 10 }, directions: ['south'] },
  { cell: { x: 2, y: 13 }, directions: ['east'] },
  { cell: { x: 3, y: 13 }, directions: ['south'] },
  { cell: { x: 3, y: 14 }, directions: ['east'] },
  { cell: { x: 7, y: 14 }, directions: ['south'] },
  { cell: { x: 11, y: 14 }, directions: ['west', 'east'] },
  { cell: { x: 15, y: 14 }, directions: ['south'] },
  { cell: { x: 16, y: 14 }, directions: ['south'] },
  { cell: { x: 18, y: 14 }, directions: ['west', 'east'] },
  { cell: { x: 23, y: 14 }, directions: ['south'] },
  { cell: { x: 26, y: 14 }, directions: ['west'] },
  { cell: { x: 7, y: 18 }, directions: ['east'] },
  { cell: { x: 9, y: 18 }, directions: ['south'] },
  { cell: { x: 9, y: 19 }, directions: ['east'] },
  { cell: { x: 11, y: 19 }, directions: ['south'] },
  { cell: { x: 15, y: 19 }, directions: ['west'] },
  { cell: { x: 16, y: 19 }, directions: ['east'] },
  { cell: { x: 19, y: 19 }, directions: ['south'] },
  { cell: { x: 23, y: 19 }, directions: ['west'] },
];

const expectedSpawns = [
  { cell: { x: 9, y: 0 }, direction: 'south' },
  { cell: { x: 10, y: 0 }, direction: 'south' },
  { cell: { x: 18, y: 0 }, direction: 'south' },
  { cell: { x: 19, y: 0 }, direction: 'south' },
] as const;
const expectedExits = [{ x: 11, y: 23 }, { x: 19, y: 23 }] as const;

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function routeSignature(route: WaveRouteDefinition): string {
  const redirects = route.redirects.map(({ cell, directions }) => (
    `${cell.x},${cell.y}:${directions.join(',')}`
  )).join(';');
  return `${route.spawn.cell.x},${route.spawn.cell.y}:${route.spawn.direction}`
    + `>${redirects}>${route.exit.x},${route.exit.y}`;
}

function enumerateRoutesFromStaticGraph(): WaveRouteDefinition[] {
  const graph = new Map(expectedRedirects.map(({ cell, directions }) => [cellKey(cell), directions]));
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
        `route stays in bounds at (${current.x},${current.y})`,
      );
      const exit = expectedExits.find(({ x, y }) => x === current.x && y === current.y);
      if (exit) {
        routes.push({ spawn, redirects, exit });
        return;
      }
      const directions = graph.get(cellKey(current));
      if (!directions) continue;
      const key = cellKey(current);
      assert.equal(visited.has(key), false, `route graph has no cycle at ${key}`);
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
    assert.fail(`route from (${spawn.cell.x},${spawn.cell.y}) did not reach an exit`);
  };
  for (const spawn of expectedSpawns) follow(spawn, spawn.cell, spawn.direction, [], new Set());
  return routes;
}

test('maps all four APK spawn markers and two exits to the original cells', () => {
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 40), [[9, 0]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 41), [[10, 0]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 42), [[18, 0]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 43), [[19, 0]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 48), [[11, 23], [19, 23]]);
  assert.deepEqual(lostCitySpawnPoints, expectedSpawns);
  assert.deepEqual(lostCityExits, expectedExits);
});

test('preserves all 38 APK redirectors, their edge order, and ten complete paths', () => {
  assert.deepEqual(lostCityRedirects, expectedRedirects);
  assert.equal(lostCityRedirects.length, 38);
  const routeEdges = lostCityRedirects.reduce((total, { directions }) => total + directions.length, 0);
  assert.equal(routeEdges, 42);
  assert.equal(routeEdges + expectedSpawns.length, 46);

  const markerCoordinates = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 53 || code === 54 || code === 55 || code === 59 ? [{ x, y }] : []
  )));
  assert.deepEqual(markerCoordinates.map(cellKey), expectedRedirects.map(({ cell }) => cellKey(cell)));

  const expectedRoutes = enumerateRoutesFromStaticGraph();
  assert.equal(expectedRoutes.length, 10);
  assert.equal(lostCityRouteDefinitions.length, 10);
  assert.equal(new Set(lostCityRouteDefinitions.map(routeSignature)).size, 10);
  assert.deepEqual(
    lostCityRouteDefinitions.map(routeSignature).sort(),
    expectedRoutes.map(routeSignature).sort(),
  );

  assert.deepEqual(
    lostCityRouteDefinitions.map((route) => {
      const redirects = route.redirects;
      const points = [route.spawn.cell, ...redirects.map(({ cell }) => cell), route.exit];
      let distance = 0;
      for (let index = 1; index < points.length; index += 1) {
        distance += Math.abs(points[index]!.x - points[index - 1]!.x)
          + Math.abs(points[index]!.y - points[index - 1]!.y);
      }
      return distance;
    }).sort((a, b) => a - b),
    [34, 35, 37, 37, 37, 38, 38, 38, 39, 39],
  );
});

test('maps every Lost City scenery and recruitment building marker to an asset at its TDM cell', () => {
  const scene = createLostCityMapScene();
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
    112: 'b_3x2_saloon',
    113: 'b_3x2_fort',
    114: 'b_2x1_tipi',
    116: 'b_2x1_shack',
    117: 'b_1x1_tipi_small',
    126: 'e_1x1_rocks_water',
  };
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    assetByCode[code] ? [{ asset: assetByCode[code]!, cell: { x, y } }] : []
  )));
  const decorations = scene.decorations ?? [];
  assert.equal(decorations.length, 40);
  assert.deepEqual(decorations.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 112), [[27, 3]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 113), [[28, 17]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 114), [[3, 2]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 117), [[5, 1], [0, 2]]);

  const stake = decorations.find(({ asset }) => asset === 'b_1x1_stake');
  assert.deepEqual(stake?.collisionBoxFine, { x: 1920, y: 2612, width: 3840, height: 2534 });
  const fort = decorations.find(({ asset }) => asset === 'b_3x2_fort');
  assert.deepEqual(fort?.collisionBoxFine, { x: -9408, y: -9600, width: 18048, height: 7680 });
  const shack = decorations.find(({ asset }) => asset === 'b_2x1_shack');
  assert.equal(shack?.anchorOffsetX, -0.5);
  assert.deepEqual(shack?.fieldBlockBounds, { left: -1, right: 1, top: 0, bottom: 0 });

  for (const decoration of decorations) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(decoration.asset))));
  }
});

test('creates two separate five-component trains and keeps every wagon in its source cell', () => {
  const units = createLostCityTrainUnits();
  assert.equal(units.length, 10);
  assert.deepEqual([...new Set(units.map(({ movementGroupId }) => movementGroupId))], [
    'lost-city-horizontal-train-1',
    'lost-city-horizontal-train-2',
  ]);
  assert.deepEqual(units.map(({ type, activity, asset, cell }) => ({ type, activity, asset, cell })), [
    ...[4, 5, 6, 7, 8].map((x, index) => ({
      type: index === 0 ? 'train-10' : index === 1 ? 'train-11' : 'train-12',
      activity: index < 2 ? 5 : 4,
      asset: index === 0 ? 'lok_hori_1of2' : index === 1 ? 'lok_hori_2of2' : 'lok_wagon_hori',
      cell: { x, y: 11 },
    })),
    ...[21, 22, 23, 24, 25].map((x, index) => ({
      type: index === 0 ? 'train-10' : index === 1 ? 'train-11' : 'train-12',
      activity: index < 2 ? 5 : 4,
      asset: index === 0 ? 'lok_hori_1of2' : index === 1 ? 'lok_hori_2of2' : 'lok_wagon_hori',
      cell: { x, y: 11 },
    })),
  ]);
});

test('maps fresh-game unit markers to source types, activities, and exact cells', () => {
  const units = createLostCityMapUnits(() => true);
  const codeSpecs = [
    [96, 'gunslinger', 4, [[25, 4], [11, 5], [28, 13], [4, 16], [7, 20]]],
    [97, 'mexican', 4, [[19, 6], [16, 21]]],
    [98, 'cannon', 4, [[6, 10], [21, 10], [5, 19], [27, 20]]],
    [99, 'indian', 4, [[3, 5], [26, 7], [1, 15], [10, 16]]],
    [100, 'sniper', 4, [[14, 17]]],
    [101, 'grandpa', 4, [[18, 4], [19, 15]]],
    [104, 'gunslinger', 5, [[14, 10]]],
    [105, 'mexican', 5, [[13, 10]]],
    [107, 'indian', 5, [[15, 10]]],
    [130, 'pyromaniac', 4, [[21, 21]]],
    [131, 'salesman', 4, [[16, 6]]],
  ] as const;
  const expected = codeSpecs.flatMap(([, type, activity, cells]) => cells.map(([x, y]) => ({
    type, activity, cell: { x, y },
  }))).sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
  assert.equal(units.length, 23);
  const activeIndian = units.find(({ type, activity }) => type === 'indian' && activity === 5);
  assert.equal(activeIndian?.asset, 'player_indian');
  assert.deepEqual(activeIndian?.frame, { x: 0, y: 0, width: 32, height: 44 });
  assert.deepEqual(activeIndian?.render, { x: 15, y: 9.375, width: 1, height: 1.375 });
  assert.deepEqual(activeIndian?.hitArea, activeIndian?.render);
  assert.equal(activeIndian?.shotSound, 'sound_fire_arrow');
  assert.deepEqual(activeIndian?.weapon && {
    damage: activeIndian.weapon.damage,
    damageType: activeIndian.weapon.damageType,
    rangeFine: activeIndian.weapon.rangeFine,
  }, { damage: 400, damageType: 'fire', rangeFine: 38400 });
  assert.equal(activeIndian?.hirePrice, undefined);
  for (const unit of units) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(unit.asset))));
  }
  assert.deepEqual(units.map(({ type, activity, cell }) => ({ type, activity, cell })), expected);
  assert.equal(new Set(units.map(({ id }) => id)).size, units.length);
});

for (const [unitTypeId, addedCount] of [[5, 1], [6, 2], [35, 1], [36, 1]] as const) {
  test(`includes only the type-${unitTypeId} map units when that profile milestone is unlocked`, () => {
    const baseUnits = createLostCityMapUnits((id) => id >= 1 && id <= 4);
    const unlockedUnits = createLostCityMapUnits((id) => (id >= 1 && id <= 4) || id === unitTypeId);
    assert.equal(baseUnits.length, 18);
    assert.equal(unlockedUnits.length, 18 + addedCount);
    assert.equal(unlockedUnits.filter(({ type }) => type === ({ 5: 'sniper', 6: 'grandpa', 35: 'pyromaniac', 36: 'salesman' } as const)[unitTypeId]).length, addedCount);
  });
}
