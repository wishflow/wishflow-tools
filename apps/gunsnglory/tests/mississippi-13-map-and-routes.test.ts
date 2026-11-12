import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/mississippi-13.json';
import { createMississippi13MapScene } from '../src/content/mississippi-13-scene';
import { mississippi13RouteDefinitions } from '../src/content/mississippi-13-routes';
import type { Direction, WaveRouteDefinition } from '../src/game';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const regionAtlasAliases: Readonly<Record<string, string>> = Object.freeze({
  tiles_canyon: 'miss_tiles_canyon',
  tiles_canyon_wall_var: 'miss_tiles_canyon_wall_var',
  tiles_desert: 'miss_tiles_desert',
  tiles_desert_var: 'miss_tiles_desert_var',
  tiles_waterside: 'miss_tiles_waterside',
  tiles_waterside_var: 'miss_tiles_waterside_var',
  tiles_path: 'miss_tiles_path',
  tiles_path_var: 'miss_tiles_path_var',
});
const directionsByActionId: readonly (readonly Direction[])[] = [
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
];
const vectorByDirection: Readonly<Record<Direction, { x: number; y: number }>> = {
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
};

interface RouteField {
  cell: { x: number; y: number };
  code: number;
  kind: 'spawn' | 'turn' | 'exit';
}

function applyMississippiAtlases<T extends { asset: string }>(tiles: readonly T[]): T[] {
  return tiles.map((tile) => ({ ...tile, asset: regionAtlasAliases[tile.asset] ?? tile.asset }));
}

function readApkGrid(): number[][] {
  const bytes = readFileSync(path.join(appRoot, 'public/content/maps/td_map_16.tdm'));
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  return Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function fieldAt(grid: readonly (readonly number[])[], x: number, y: number): RouteField | undefined {
  const code = grid[y]?.[x];
  if (code === undefined) return undefined;
  if (code >= 40 && code <= 46) return { cell: { x, y }, code, kind: 'spawn' };
  if (code === 48) return { cell: { x, y }, code, kind: 'exit' };
  if (code >= 52 && code <= 65) return { cell: { x, y }, code, kind: 'turn' };
  return undefined;
}

function nextControl(
  grid: readonly (readonly number[])[],
  start: { x: number; y: number },
  direction: Direction,
): RouteField | undefined {
  const vector = vectorByDirection[direction];
  let x = start.x;
  let y = start.y;
  while (true) {
    x += vector.x;
    y += vector.y;
    if (x < 0 || y < 0 || y >= grid.length || x >= grid[0]!.length) return undefined;
    const field = fieldAt(grid, x, y);
    if (field?.kind === 'turn' || field?.kind === 'exit') return field;
  }
}

function routesFromApkGrid(grid: readonly (readonly number[])[]): WaveRouteDefinition[] {
  const fields = grid.flatMap((row, y) => row.flatMap((_, x) => {
    const field = fieldAt(grid, x, y);
    return field ? [field] : [];
  }));
  const routes: WaveRouteDefinition[] = [];
  for (const spawn of fields.filter(({ kind }) => kind === 'spawn')) {
    const direction = spawn.cell.x === 0 ? 'east' : spawn.cell.x === grid[0]!.length - 1
      ? 'west' : spawn.cell.y === 0 ? 'south' : 'north';
    const walk = (
      current: RouteField,
      currentDirection: Direction,
      redirects: WaveRouteDefinition['redirects'],
      visited: ReadonlySet<string>,
    ) => {
      const next = nextControl(grid, current.cell, currentDirection);
      assert.ok(next, `APK route leaves the grid from ${cellKey(current.cell)}`);
      assert.ok(!visited.has(cellKey(next.cell)), `APK route cycles at ${cellKey(next.cell)}`);
      const nextRedirects = current.kind === 'turn'
        ? [...redirects, { cell: current.cell, directions: [currentDirection] }]
        : redirects;
      if (next.kind === 'exit') {
        routes.push({ spawn: { cell: spawn.cell, direction }, redirects: nextRedirects, exit: next.cell });
        return;
      }
      const allowedDirections = directionsByActionId[next.code - 52];
      assert.ok(allowedDirections, `APK action ${next.code} has a decoded direction`);
      const nextVisited = new Set(visited).add(cellKey(next.cell));
      for (const nextDirection of allowedDirections) {
        walk(next, nextDirection, nextRedirects, nextVisited);
      }
    };
    walk(spawn, direction, [], new Set([cellKey(spawn.cell)]));
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

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('Golden River map16 matches APK grid, deterministic Mississippi terrain, and both bridge layers', () => {
  const tdmPath = path.join(appRoot, 'public/content/maps/td_map_16.tdm');
  const bytes = readFileSync(tdmPath);
  assert.equal(bytes.length, 770);
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    '274d0112ddc75fe0165398ce6628bc36b92dcbe5e254a9f86d049326e6377b35',
  );
  assert.equal(map.id, 'golden-river');
  assert.equal(map.source.resource, 'res/raw/td_map_16.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, readApkGrid());

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyMississippiAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyMississippiAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori')
    .map(({ x, y }) => [x + 0.25, y]), [[8, 19], [9, 19]]);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti')
    .map(({ x, y }) => [x, y + 0.25]), [
    [11, 1], [25, 1], [11, 2], [25, 2], [11, 3], [25, 3], [24, 19], [24, 20], [24, 21],
  ]);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_left')
    .map(({ x, y }) => [x + 0.25, y - 0.75]), [[8, 19]]);
  assert.deepEqual(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_pier_right')
    .map(({ x, y }) => [x - 0.5, y - 0.75]), [[9, 19]]);

  const assets = new Set([...map.map.background, ...map.map.streets].map(({ asset }) => asset));
  for (const asset of assets) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} render asset is bundled`);
    const dimensions = pngDimensions(assetPath);
    const sourceScale = gameAssetSourceScale(asset);
    for (const tile of [...map.map.background, ...map.map.streets].filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= dimensions.width / sourceScale, `${asset} source x-range is in atlas`);
      assert.ok(tile.source.y + tile.source.height <= dimensions.height / sourceScale, `${asset} source y-range is in atlas`);
    }
  }
});

test('Golden River map markers create its exact Mississippi decorations, including the code76 bush', () => {
  const grid = map.originalTileGrid;
  const scene = createMississippi13MapScene();
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));
  const markerCells = (code: number) => grid.flatMap((row, y) => row.flatMap((value, x) => (
    value === code ? [[x, y]] : []
  )));
  assert.deepEqual(markerCells(76), [[11, 6]]);

  const decorations = scene.decorations ?? [];
  const actualCells = (asset: string) => decorations
    .filter((item) => item.asset === asset)
    .map(({ cell }) => [cell.x, cell.y]);
  assert.deepEqual(actualCells('e_1x1_rocks_a'), markerCells(69));
  assert.deepEqual(actualCells('e_1x1_rocks_b'), markerCells(70));
  assert.deepEqual(actualCells('e_1x1_tree'), markerCells(71));
  assert.deepEqual(actualCells('e_1x1_bush'), [[11, 6]]);
});

test('Golden River routes cover every APK control marker without leaving the map', () => {
  const grid = readApkGrid();
  assert.deepEqual(map.originalTileGrid, grid);
  const fields = grid.flatMap((row, y) => row.flatMap((_, x) => {
    const field = fieldAt(grid, x, y);
    return field ? [field] : [];
  }));
  const spawns = fields.filter(({ kind }) => kind === 'spawn');
  const turns = fields.filter(({ kind }) => kind === 'turn');
  const exits = fields.filter(({ kind }) => kind === 'exit');
  assert.equal(spawns.length, 4);
  assert.equal(turns.length, 48);
  assert.equal(exits.length, 4);
  assert.deepEqual(spawns.map(({ cell }) => cell), [
    { x: 0, y: 7 }, { x: 0, y: 8 }, { x: 0, y: 16 }, { x: 0, y: 17 },
  ]);
  assert.deepEqual(exits.map(({ cell }) => cell), [
    { x: 31, y: 6 }, { x: 31, y: 7 }, { x: 31, y: 18 }, { x: 31, y: 19 },
  ]);
  const expectedRoutes = routesFromApkGrid(grid);
  assert.equal(expectedRoutes.length, 4);
  assert.deepEqual(
    mississippi13RouteDefinitions.map(routeSignature).sort(),
    expectedRoutes.map(routeSignature).sort(),
  );
  assert.deepEqual(mississippi13RouteDefinitions.map(({ spawn, exit }) => (
    [cellKey(spawn.cell), cellKey(exit)]
  )), [
    ['0,7', '31,6'], ['0,8', '31,7'], ['0,16', '31,18'], ['0,17', '31,19'],
  ]);

  const edgeKeys = new Set<string>();
  const visitedTurns = new Set<string>();
  for (const route of mississippi13RouteDefinitions) {
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const waypoint of [...route.redirects, { cell: route.exit, directions: [] as Direction[] }]) {
      const next = nextControl(grid, current, direction);
      assert.deepEqual(next?.cell, waypoint.cell, 'each route follows the nearest APK action field');
      edgeKeys.add(`${cellKey(current)}:${direction}->${cellKey(waypoint.cell)}`);
      if (next?.kind === 'exit') break;
      assert.equal(next?.kind, 'turn');
      const marker = grid[waypoint.cell.y]?.[waypoint.cell.x];
      const allowed = directionsByActionId[marker! - 52];
      assert.ok(allowed?.includes(waypoint.directions[0]!), `TDM action ${marker} allows the selected direction`);
      assert.equal(waypoint.directions.length, 1);
      visitedTurns.add(cellKey(waypoint.cell));
      current = waypoint.cell;
      direction = waypoint.directions[0]!;
    }
  }
  assert.equal(edgeKeys.size, 52);
  assert.equal(visitedTurns.size, 48);
});
