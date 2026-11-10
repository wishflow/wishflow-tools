import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-08.json';
import { createCactusvilleMapScene } from '../src/content/cactusville-scene';
import {
  cactusvilleExits,
  cactusvilleRedirects,
  cactusvilleRouteDefinitions,
  cactusvilleSpawnPoints,
} from '../src/content/cactusville-routes';
import { createCactusvilleUnits } from '../src/content/cactusville-units';
import { pairDynamiteObjects } from '../src/game/dynamite';
import { createRoutePriorityMap } from '../src/game/route-priority';
import type { Direction, ScenarioContent, WaveRouteDefinition } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedFrequency: Readonly<Record<number, number>> = {
  0: 135, 16: 53, 32: 98, 36: 35, 40: 1, 41: 1, 48: 2, 52: 10, 54: 5, 55: 8,
  57: 1, 68: 2, 69: 1, 70: 1, 71: 1, 72: 1, 73: 2, 75: 1, 76: 1, 77: 2,
  80: 2, 89: 3, 90: 7, 91: 2, 92: 3, 94: 1, 95: 1, 96: 6, 97: 5, 98: 4,
  99: 2, 100: 1, 101: 2, 102: 1, 110: 1, 112: 1, 113: 1, 114: 1, 116: 1,
  130: 1, 131: 1,
};

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

function expandRoute(route: WaveRouteDefinition): [number, number][] {
  const cells: [number, number][] = [[route.spawn.cell.x, route.spawn.cell.y]];
  let current = { ...route.spawn.cell };
  let direction = route.spawn.direction;
  const vector: Readonly<Record<Direction, readonly [number, number]>> = {
    east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1],
  };

  for (const target of [...route.redirects, { cell: route.exit, directions: [] }]) {
    const [dx, dy] = vector[direction];
    assert.ok(
      (current.x === target.cell.x || current.y === target.cell.y)
      && Math.sign(target.cell.x - current.x) === dx
      && Math.sign(target.cell.y - current.y) === dy,
      `route continues ${direction} from (${current.x},${current.y}) to (${target.cell.x},${target.cell.y})`,
    );
    while (current.x !== target.cell.x || current.y !== target.cell.y) {
      current = { x: current.x + dx, y: current.y + dy };
      cells.push([current.x, current.y]);
    }
    if (target.directions.length > 0) direction = target.directions[0]!;
  }
  return cells;
}

test('preserves every APK map08 TDM byte, dimension, and tile frequency', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_08.tdm'));
  assert.equal(map.id, 'cactusville');
  assert.equal(map.source.resource, 'res/raw/td_map_08.tdm');
  assert.deepEqual([...bytes.subarray(0, 2)], [17, 24]);
  assert.equal(bytes.length, 2 + (17 * 24));
  assert.equal(map.map.width, 17);
  assert.equal(map.map.height, 24);
  assert.equal(map.map.tileSize, 32);
  assert.equal(map.originalTileGrid.length, 24);

  for (let y = 0; y < 24; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, 17, `row ${y} has 17 cells`);
    for (let x = 0; x < 17; x += 1) {
      assert.equal(bytes[2 + y * 17 + x], map.originalTileGrid[y]?.[x], `TDM cell (${x},${y})`);
    }
  }
  const frequency = new Map<number, number>();
  for (const code of bytes.subarray(2)) frequency.set(code, (frequency.get(code) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries([...frequency].sort(([a], [b]) => a - b)), expectedFrequency);
});

test('rebuilds the APK-derived map08 terrain, paths, bridges, and vertical railway', () => {
  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 17 * 24);
  assert.deepEqual({
    paths: map.map.streets.filter(({ asset }) => asset === 'tiles_path' || asset === 'tiles_path_var').length,
    horizontalBridges: map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length,
    verticalBridges: map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length,
    verticalRailTiles: map.map.streets.filter(({ asset }) => asset === 'tiles_railway_verti').length,
  }, { paths: 56, horizontalBridges: 2, verticalBridges: 0, verticalRailTiles: 15 });

  for (const asset of new Set([
    ...map.map.background.map(({ asset }) => asset),
    ...map.map.streets.map(({ asset }) => asset),
  ])) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `asset ${asset} exists`);
  }
});

test('maps Cactusville static objects and three recruitment buildings to APK cells', () => {
  const scene = createCactusvilleMapScene();
  const assetByCode: Readonly<Record<number, string>> = {
    68: 'e_1x1_cactus_a', 69: 'e_1x1_rocks_a', 70: 'e_1x1_rocks_b', 71: 'e_1x1_tree',
    72: 'b_1x1_stake', 73: 'e_1x1_cactus_b', 75: 'b_1x1_watertower', 76: 'e_1x1_bush',
    77: 'e_1x2_bones', 94: 'tiles_railway_buffers_verti_up', 95: 'tiles_railway_buffers_verti_down',
    112: 'b_3x2_saloon', 113: 'b_3x2_fort', 114: 'b_2x1_tipi', 116: 'b_2x1_shack',
  };
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    assetByCode[code] ? [{ asset: assetByCode[code]!, cell: { x, y } }] : []
  )));
  assert.deepEqual(scene.decorations?.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.equal(scene.decorations?.length, 18);
  assert.deepEqual(scene.decorations?.filter(({ asset }) => asset.startsWith('tiles_railway_buffers_'))
    .map(({ asset, cell }) => ({ asset, cell })), [
      { asset: 'tiles_railway_buffers_verti_up', cell: { x: 11, y: 3 } },
      { asset: 'tiles_railway_buffers_verti_down', cell: { x: 11, y: 19 } },
    ]);

  for (const asset of new Set((scene.decorations ?? []).map(({ asset }) => asset))) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `asset ${asset} exists`);
  }
});

test('creates the 22 map units, preserves unlock gates, and uses the APK vertical train layout', () => {
  const units = createCactusvilleUnits(() => true);
  assert.equal(units.length, 27);
  assert.deepEqual(Object.fromEntries(
    ['gunslinger', 'mexican', 'cannon', 'indian', 'sniper', 'grandpa', 'pyromaniac', 'salesman']
      .map((type) => [type, units.filter((unit) => unit.type === type).length]),
  ), {
    gunslinger: 6, mexican: 5, cannon: 4, indian: 2, sniper: 1, grandpa: 2, pyromaniac: 1, salesman: 1,
  });
  const train = units.filter(({ movementGroupId }) => movementGroupId === 'cactusville-train');
  assert.deepEqual(train.map(({ cell, type }) => [type, cell.x, cell.y]), [
    ...[8, 9, 10].map((y) => ['train-22', 11, y]),
    ['train-20', 11, 11], ['train-21', 11, 12],
  ]);
  const lockedUnits = createCactusvilleUnits((unitTypeId) => unitTypeId <= 4);
  assert.equal(lockedUnits.length, 22);
  assert.equal(lockedUnits.some(({ type }) => ['sniper', 'grandpa', 'pyromaniac', 'salesman'].includes(type)), false);

  const mapUnits = units.filter(({ movementGroupId }) => movementGroupId !== 'cactusville-train');
  assert.equal(mapUnits.length, 22);
  assert.ok(mapUnits.every((unit) => map.originalTileGrid[unit.cell.y]?.[unit.cell.x] !== undefined));
  for (const asset of new Set(units.map(({ asset }) => asset))) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `asset ${asset} exists`);
  }
});

test('pairs the TDM dynamite trigger and box at their original cells', () => {
  assert.deepEqual(pairDynamiteObjects(map.originalTileGrid, false), {
    unlocked: false,
    pairs: [{ id: 'dynamite-1', triggerCell: { x: 14, y: 6 }, boxCell: { x: 14, y: 8 } }],
  });
});

test('follows both code57 outcomes and pool1 from APK spawn order to the exact exits', () => {
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 41), [[0, 23]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 40), [[1, 23]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 48), [[0, 1], [0, 2]]);
  assert.deepEqual(cactusvilleSpawnPoints, [
    { cell: { x: 0, y: 23 }, direction: 'north' },
    { cell: { x: 1, y: 23 }, direction: 'north' },
  ]);
  assert.deepEqual(cactusvilleExits, [{ x: 0, y: 2 }, { x: 0, y: 1 }]);
  assert.deepEqual(cactusvilleRouteDefinitions.map(expandRoute).map((cells) => cells.length), [36, 52, 54]);
  assert.deepEqual(cactusvilleRedirects.find(({ cell }) => cell.x === 5 && cell.y === 16)?.directions, ['north', 'east']);

  const branchRoutes = cactusvilleRouteDefinitions.slice(0, 2).map(expandRoute);
  assert.deepEqual(branchRoutes[0]?.at(-1), [0, 2]);
  assert.deepEqual(branchRoutes[1]?.at(-1), [0, 2]);
  assert.notDeepEqual(branchRoutes[0], branchRoutes[1]);
  const poolOneRoute = expandRoute(cactusvilleRouteDefinitions[2]!);
  assert.deepEqual(poolOneRoute.at(-1), [0, 1]);
  for (const cells of [...branchRoutes, poolOneRoute]) {
    assert.ok(cells.every(([x, y]) => x >= 0 && x < 17 && y >= 0 && y < 24));
    assert.ok(cells.every(([x, y]) => [16, 32, 40, 41, 48, 52, 54, 55, 57, 80, 89].includes(map.originalTileGrid[y]?.[x] ?? -1)),
      'enemy path cells stay on the original road, canyon floor, bridge, and direction markers');
  }

  const redirectAtBranch = cactusvilleRedirects.find(({ cell }) => cell.x === 5 && cell.y === 16);
  assert.deepEqual(redirectAtBranch?.directions, ['north', 'east']);
  const priorityMap = createRoutePriorityMap({
    ...map,
    id: 'cactusville-route-test',
    units: [],
    previewWave: {
      number: 1,
      initialLives: 10,
      spawn: cactusvilleSpawnPoints[0]!,
      additionalSpawns: [cactusvilleSpawnPoints[1]!],
      routes: cactusvilleRouteDefinitions,
      baseEnemySpeed: 500,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      escapePenalty: 1,
      redirects: cactusvilleRedirects,
      exit: cactusvilleExits[0]!,
      additionalExits: [cactusvilleExits[1]!],
    },
  } as ScenarioContent);
  assert.ok(branchRoutes.flat().every(([x, y]) => priorityMap.getTargetPriority(x, y) > 0));
});
