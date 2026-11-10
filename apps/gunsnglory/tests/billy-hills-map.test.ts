import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-05.json';
import { createBillyHillsMapScene } from '../src/content/billy-hills-scene';
import { billyHillsExits, billyHillsRedirects, billyHillsRouteDefinitions, billyHillsSpawnPoints } from '../src/content/billy-hills-routes';
import { createBillyHillsUnits } from '../src/content/billy-hills-units';
import { createRoutePriorityMap } from '../src/game/route-priority';
import { createGame, type Direction, type ScenarioContent, type WaveRouteDefinition } from '../src/game';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedFrequency: Readonly<Record<number, number>> = {
  0: 355, 16: 87, 32: 94, 36: 64, 40: 1, 41: 1, 48: 2,
  52: 7, 53: 9, 54: 3, 55: 13, 58: 1, 59: 1,
  68: 7, 69: 4, 70: 4, 72: 2, 73: 3, 74: 2, 75: 1, 76: 3,
  80: 5, 82: 21, 83: 2, 84: 5, 86: 1, 87: 1, 88: 9,
  96: 9, 97: 6, 98: 3, 99: 10, 100: 1, 101: 2, 104: 1, 105: 1,
  112: 1, 113: 1, 114: 1, 116: 2, 117: 2, 124: 17, 126: 1, 130: 1, 131: 1,
};

const directionByCode: Readonly<Record<number, Direction>> = {
  52: 'north', 53: 'south', 54: 'west', 55: 'east',
};

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

function expandRoute(route: WaveRouteDefinition): [number, number][] {
  const cells: [number, number][] = [[route.spawn.cell.x, route.spawn.cell.y]];
  let current = { ...route.spawn.cell };
  let direction = route.spawn.direction;
  for (const target of [...route.redirects, { cell: route.exit, directions: [] }]) {
    const vector = {
      east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1],
    } as const;
    const [dx, dy] = vector[direction];
    assert.ok(
      (current.x === target.cell.x || current.y === target.cell.y)
      && Math.sign(target.cell.x - current.x) === dx
      && Math.sign(target.cell.y - current.y) === dy,
      `route continues ${direction} from (${current.x}, ${current.y}) to (${target.cell.x}, ${target.cell.y})`,
    );
    while (current.x !== target.cell.x || current.y !== target.cell.y) {
      current = { x: current.x + dx, y: current.y + dy };
      cells.push([current.x, current.y]);
    }
    if (target.cell !== route.exit) direction = target.directions[0]!;
  }
  return cells;
}

function traceOriginalTdmRoute(
  spawn: { cell: { x: number; y: number }; direction: Direction },
  northSouthAt58?: 'north' | 'south',
  westEastAt59?: 'west' | 'east',
): { cells: [number, number][]; redirects: [number, number, Direction][]; exit: [number, number] } {
  const cells: [number, number][] = [[spawn.cell.x, spawn.cell.y]];
  const redirects: [number, number, Direction][] = [];
  const seen = new Set<string>();
  let current = { ...spawn.cell };
  let direction = spawn.direction;

  for (let step = 0; step < map.map.width * map.map.height; step += 1) {
    const key = `${current.x},${current.y}`;
    assert.equal(seen.has(key), false, `APK route does not loop at ${key}`);
    seen.add(key);
    const code = map.originalTileGrid[current.y]?.[current.x];
    assert.notEqual(code, undefined, `APK route stays inside the TDM at ${key}`);
    if (code === 48) return { cells, redirects, exit: [current.x, current.y] };

    const fixedDirection = directionByCode[code!];
    if (fixedDirection) direction = fixedDirection;
    else if (code === 58) direction = northSouthAt58!;
    else if (code === 59) direction = westEastAt59!;
    if (code === 58 || code === 59 || fixedDirection) redirects.push([current.x, current.y, direction]);

    const vectors = {
      east: [1, 0], south: [0, 1], west: [-1, 0], north: [0, -1],
    } as const;
    const [dx, dy] = vectors[direction];
    current = { x: current.x + dx, y: current.y + dy };
    cells.push([current.x, current.y]);
  }
  assert.fail('APK route must reach a TDM exit');
}

test('preserves the exact 32×24 Billy Hills APK TDM bytes and all code frequencies', () => {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_05.tdm'));
  assert.equal(map.id, 'billy-hills');
  assert.equal(map.source.resource, 'res/raw/td_map_05.tdm');
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  assert.equal(bytes.length, 2 + (32 * 24));
  assert.equal(map.map.width, 32);
  assert.equal(map.map.height, 24);
  assert.equal(map.map.tileSize, 32);
  assert.equal(map.originalTileGrid.length, 24);

  for (let y = 0; y < 24; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, 32, `row ${y} has 32 cells`);
    for (let x = 0; x < 32; x += 1) {
      assert.equal(bytes[2 + (y * 32) + x], map.originalTileGrid[y]?.[x], `TDM cell (${x}, ${y})`);
    }
  }

  const frequency = new Map<number, number>();
  for (const code of bytes.subarray(2)) frequency.set(code, (frequency.get(code) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries([...frequency].sort(([a], [b]) => a - b)), expectedFrequency);
});

test('rebuilds all Billy Hills terrain, path, and railway draw layers from the APK grid', () => {
  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 32 * 24);
  assert.deepEqual({
    horizontalRailTiles: map.map.streets.filter(({ asset }) => asset === 'tiles_railway_hori').length,
    paths: map.map.streets.filter(({ asset }) => asset === 'tiles_path' || asset === 'tiles_path_var').length,
    bridges: map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori' || asset === 'tiles_bridge_verti').length,
  }, { horizontalRailTiles: 28, paths: 90, bridges: 14 });

  const assets = new Set([
    ...map.map.background.map(({ asset }) => asset),
    ...map.map.streets.map(({ asset }) => asset),
  ]);
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `asset ${asset} exists`);
  }
});

test('maps all original Billy Hills scenery markers to their exact cells and assets', () => {
  const scene = createBillyHillsMapScene();
  const assetsByCode: Readonly<Record<number, string>> = {
    68: 'e_1x1_cactus_a', 69: 'e_1x1_rocks_a', 70: 'e_1x1_rocks_b', 72: 'b_1x1_stake',
    73: 'e_1x1_cactus_b', 74: 'b_1x1_windmill', 75: 'b_1x1_watertower', 76: 'e_1x1_bush',
    86: 'tiles_railway_buffers_hori_left', 87: 'tiles_railway_buffers_hori_right',
    112: 'b_3x2_saloon', 113: 'b_3x2_fort', 114: 'b_2x1_tipi', 116: 'b_2x1_shack',
    117: 'b_1x1_tipi_small', 126: 'e_1x1_rocks_water',
  };
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    assetsByCode[code] ? [{ asset: assetsByCode[code]!, cell: { x, y } }] : []
  )));
  assert.deepEqual(scene.decorations?.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.equal(scene.decorations?.length, 36);
  assert.deepEqual(scene.decorations?.filter(({ asset }) => asset.startsWith('tiles_railway_buffers_'))
    .map(({ asset, cell }) => ({ asset, cell })), [
    { asset: 'tiles_railway_buffers_hori_left', cell: { x: 1, y: 22 } },
    { asset: 'tiles_railway_buffers_hori_right', cell: { x: 30, y: 22 } },
  ]);
  assert.deepEqual(scene.decorations?.find(({ asset }) => asset === 'b_3x2_fort'), {
    asset: 'b_3x2_fort',
    cell: { x: 22, y: 3 },
    anchorOffsetY: -0.3,
    collisionBoxFine: { x: -9408, y: -9600, width: 18048, height: 7680 },
  });

  const assets = new Set(scene.decorations?.map(({ asset }) => asset));
  for (const asset of assets) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `asset ${asset} exists`);
  }
});

test('reproduces all five APK route variants, direction fields, exits, and priority scores', () => {
  assert.deepEqual(billyHillsSpawnPoints, [
    { cell: { x: 0, y: 5 }, direction: 'east' },
    { cell: { x: 0, y: 13 }, direction: 'east' },
  ]);
  assert.deepEqual(billyHillsExits, [{ x: 31, y: 7 }, { x: 31, y: 8 }]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 40), [[0, 5]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 41), [[0, 13]]);
  assert.deepEqual(coordinatesForCode(map.originalTileGrid, 48), [[31, 7], [31, 8]]);

  const allRoutes = billyHillsRouteDefinitions.map((route) => {
    const branch58 = route.redirects.find(({ cell }) => map.originalTileGrid[cell.y]?.[cell.x] === 58)?.directions[0];
    const branch59 = route.redirects.find(({ cell }) => map.originalTileGrid[cell.y]?.[cell.x] === 59)?.directions[0];
    const traced = traceOriginalTdmRoute(route.spawn, branch58 as 'north' | 'south', branch59 as 'west' | 'east');
    assert.deepEqual(expandRoute(route), traced.cells);
    assert.deepEqual(route.redirects.map(({ cell, directions }) => [cell.x, cell.y, directions[0]]), traced.redirects);
    assert.deepEqual(route.exit, { x: traced.exit[0], y: traced.exit[1] });
    return traced.cells;
  });
  assert.equal(allRoutes.length, 5);
  assert.equal(new Set(allRoutes.flat().map(([x, y]) => `${x},${y}`)).size, 142);
  assert.deepEqual([...new Set(billyHillsRedirects.find(({ cell }) => cell.x === 7 && cell.y === 5)?.directions)], ['north', 'south']);
  assert.deepEqual([...new Set(billyHillsRedirects.find(({ cell }) => cell.x === 17 && cell.y === 10)?.directions)], ['west', 'east']);

  const firstRoute = billyHillsRouteDefinitions[0]!;
  const scenario = {
    id: 'billy-hills-route-test',
    title: map.title,
    map: createBillyHillsMapScene(),
    originalTileGrid: map.originalTileGrid,
    units: [],
    previewWave: {
      number: 1,
      initialLives: 50,
      initialCash: 250,
      spawn: firstRoute.spawn,
      additionalSpawns: billyHillsSpawnPoints.slice(1),
      routes: billyHillsRouteDefinitions,
      baseEnemySpeed: 500,
      speedMultiplierMin: 90,
      speedMultiplierCount: 20,
      escapePenalty: 1,
      redirects: billyHillsRedirects,
      exit: billyHillsExits[0]!,
      additionalExits: billyHillsExits.slice(1),
    },
  } satisfies ScenarioContent;
  assert.equal(createRoutePriorityMap(scenario).minValue, 191);
});

test('creates original eligible units and a contiguous seven-piece Billy Hills train', () => {
  const units = createBillyHillsUnits(() => true);
  const countType = (type: string) => units.filter((unit) => unit.type === type).length;
  assert.deepEqual({
    gunslinger: countType('gunslinger'),
    mexican: countType('mexican'),
    cannon: countType('cannon'),
    indian: countType('indian'),
    sniper: countType('sniper'),
    grandpa: countType('grandpa'),
    pyromaniac: countType('pyromaniac'),
    salesman: countType('salesman'),
    engine1: countType('train-10'),
    engine2: countType('train-11'),
    wagons: countType('train-12'),
  }, {
    gunslinger: 10, mexican: 7, cannon: 3, indian: 10, sniper: 1, grandpa: 2,
    pyromaniac: 1, salesman: 1, engine1: 1, engine2: 1, wagons: 5,
  });

  const activeGunslingers = units.filter(({ activity, type }) => activity === 5 && type === 'gunslinger');
  const activeMexicans = units.filter(({ activity, type }) => activity === 5 && type === 'mexican');
  assert.deepEqual(activeGunslingers.map(({ cell, asset }) => ({ cell, asset })), [
    { cell: { x: 14, y: 11 }, asset: 'player_gunslinger' },
  ]);
  assert.deepEqual(activeMexicans.map(({ cell, asset }) => ({ cell, asset })), [
    { cell: { x: 15, y: 13 }, asset: 'player_mexican' },
  ]);

  const train = units.filter(({ movementGroupId }) => movementGroupId === 'billy-hills-train');
  assert.deepEqual(train.map(({ cell, type, activity, asset, render }) => ({
    cell, type, activity, asset, render,
  })), [
    { cell: { x: 9, y: 22 }, type: 'train-10', activity: 5, asset: 'lok_hori_1of2', render: { x: 9, y: 21.5, width: 1, height: 1.5 } },
    { cell: { x: 10, y: 22 }, type: 'train-11', activity: 5, asset: 'lok_hori_2of2', render: { x: 10, y: 21.5, width: 1, height: 1.5 } },
    ...[11, 12, 13, 14, 15].map((x) => ({
      cell: { x, y: 22 }, type: 'train-12', activity: 4, asset: 'lok_wagon_hori',
      render: { x, y: 22, width: 1, height: 1 },
    })),
  ]);
  assert.ok(train.every(({ movementSpeedFinePer100Ms, movementAxis }) => (
    movementSpeedFinePer100Ms === 3000 && movementAxis === 'horizontal'
  )));
  assert.ok(train.filter(({ type }) => type === 'train-12').every(({ hirePrice, weapon }) => (
    hirePrice === 125 && weapon?.damage === 125
  )));

  const firstVisit = createBillyHillsUnits((unitTypeId) => unitTypeId <= 4);
  assert.deepEqual({
    sniper: firstVisit.filter(({ type }) => type === 'sniper').length,
    grandpa: firstVisit.filter(({ type }) => type === 'grandpa').length,
    pyromaniac: firstVisit.filter(({ type }) => type === 'pyromaniac').length,
    salesman: firstVisit.filter(({ type }) => type === 'salesman').length,
  }, { sniper: 0, grandpa: 0, pyromaniac: 0, salesman: 0 });
});

test('moves all seven train cars together without changing their source spacing', async () => {
  const units = createBillyHillsUnits(() => true);
  const scenario: ScenarioContent = {
    id: 'billy-hills-train-test',
    title: map.title,
    map: createBillyHillsMapScene(),
    originalTileGrid: map.originalTileGrid,
    units,
  };
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({ scenarioId: scenario.id });
  const initial = session.observe().units.filter(({ movementGroupId }) => movementGroupId === 'billy-hills-train');
  session.submitIntent({ type: 'select-at', x: 9.5, y: 22.5 });
  session.advance({ deltaMs: 0 });
  session.submitIntent({ type: 'move-unit', targetX: 13.5, targetY: 0 });
  const moved = session.advance({ deltaMs: 100 }).units.filter(({ movementGroupId }) => movementGroupId === 'billy-hills-train');
  assert.deepEqual(moved.map(({ positionFine }, index) => positionFine.x - initial[index]!.positionFine.x),
    [3000, 3000, 3000, 3000, 3000, 3000, 3000]);
  assert.deepEqual(moved.map(({ positionFine }, index) => positionFine.y - initial[index]!.positionFine.y),
    [0, 0, 0, 0, 0, 0, 0]);
  assert.ok(moved.slice(1).every((unit, index) => (
    unit.positionFine.x - moved[index]!.positionFine.x === 7680
  )));
});
