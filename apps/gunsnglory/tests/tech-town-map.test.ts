import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/new-mexico-04.json';
import { createTechTownMapScene } from '../src/content/tech-town-scene';
import { createTechTownFreshGameUnitPlacements } from '../src/content/tech-town-map-units';
import { createTechTownBaseUnits } from '../src/content/tech-town-units';
import { techTownRouteDefinitions } from '../src/content/tech-town-routes';
import { deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';
import { gameAssetLogicalSize, gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedCellsByCode: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  40: [[0, 3]],
  41: [[0, 4]],
  42: [[11, 23]],
  43: [[12, 23]],
  48: [[31, 17], [31, 18]],
  52: [[11, 15], [12, 16], [10, 20], [9, 21]],
  53: [[8, 3], [7, 4], [25, 9], [24, 10]],
  54: [[12, 20], [11, 21]],
  55: [[8, 9], [11, 9], [7, 10], [12, 10], [9, 15], [10, 16], [25, 17], [24, 18]],
  68: [[2, 0], [13, 0], [29, 0], [23, 2], [30, 8], [1, 13], [20, 13], [19, 18], [2, 19], [4, 23]],
  69: [[7, 1], [19, 6], [27, 10], [7, 13], [18, 16], [5, 21], [14, 21]],
  70: [[24, 1], [27, 2], [30, 6], [21, 16], [7, 20]],
  71: [[10, 1]],
  72: [[6, 16]],
  73: [[16, 1], [26, 6], [22, 18], [30, 20], [1, 22]],
  74: [[5, 8]],
  75: [[4, 11], [21, 11]],
  76: [[22, 5], [1, 10], [15, 11], [14, 15], [3, 21], [14, 23]],
  77: [[21, 2]],
  79: [],
  80: [[7, 6], [8, 6], [24, 14], [25, 14], [9, 18], [10, 18]],
  81: [[11, 12], [12, 12], [24, 12], [25, 12]],
  82: [[2, 12], [3, 12], [9, 12], [10, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12], [20, 12], [21, 12], [22, 12], [23, 12], [26, 12], [27, 12], [28, 12], [29, 12]],
  83: [[4, 12], [5, 12]],
  84: [[6, 12], [7, 12], [8, 12]],
  86: [[1, 12]],
  87: [[30, 12]],
  88: [[3, 2], [3, 3], [3, 4], [16, 8], [16, 9], [16, 10]],
  96: [[24, 3], [15, 5], [20, 5], [29, 6], [11, 7], [27, 9], [29, 10]],
  97: [[17, 3], [27, 3], [10, 4], [13, 5], [24, 5]],
  98: [[15, 14], [21, 15], [15, 19], [18, 21]],
  99: [[2, 7], [4, 9], [1, 15], [6, 15], [6, 19], [3, 20]],
  100: [[18, 11]],
  101: [[22, 6], [27, 15], [26, 19]],
  105: [[13, 11]],
  112: [[13, 3]],
  113: [[22, 20]],
  114: [[5, 17]],
  116: [[18, 5], [2, 8], [19, 19]],
  117: [[5, 14], [7, 16], [2, 18], [7, 22]],
  124: [[26, 22], [28, 22], [25, 23], [26, 23], [27, 23], [28, 23], [29, 23], [30, 23], [31, 23]],
  125: [[26, 21], [27, 21], [28, 21], [25, 22], [29, 22], [30, 22], [31, 22]],
  126: [[27, 22]],
  130: [[0, 20]],
  131: [[30, 14]],
  132: [[29, 3]],
  150: [[30, 3]],
};

const directionByCode = { 52: 'north', 53: 'south', 54: 'west', 55: 'east' } as const;
const directionVector = {
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
} as const;

function coordinatesForCode(grid: readonly (readonly number[])[], code: number): [number, number][] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [[x, y] as [number, number]] : []));
}

function expandRoute(route: (typeof techTownRouteDefinitions)[number]): [number, number][] {
  const pathCells: [number, number][] = [[route.spawn.cell.x, route.spawn.cell.y]];
  let current = { ...route.spawn.cell };
  let direction = route.spawn.direction;

  for (const target of [...route.redirects, { cell: route.exit, directions: [] }]) {
    const vector = directionVector[direction];
    assert.ok(
      (current.x === target.cell.x || current.y === target.cell.y)
      && Math.sign(target.cell.x - current.x) === vector.x
      && Math.sign(target.cell.y - current.y) === vector.y,
      `route from (${current.x}, ${current.y}) must continue ${direction} to (${target.cell.x}, ${target.cell.y})`,
    );

    while (current.x !== target.cell.x || current.y !== target.cell.y) {
      current = { x: current.x + vector.x, y: current.y + vector.y };
      assert.ok(current.x >= 0 && current.x < map.map.width, `route x=${current.x} stays inside the map`);
      assert.ok(current.y >= 0 && current.y < map.map.height, `route y=${current.y} stays inside the map`);

      const rawCode = map.originalTileGrid[current.y]?.[current.x];
      if (rawCode === 48 || (rawCode !== undefined && rawCode >= 52 && rawCode <= 65)) {
        assert.deepEqual(
          current,
          target.cell,
          `route must visit raw field ${rawCode} at (${current.x}, ${current.y}) before continuing`,
        );
      }
      pathCells.push([current.x, current.y]);
    }

    if (target.cell !== route.exit) direction = target.directions[0]!;
  }

  return pathCells;
}

test('preserves the original Tech Town 32×24 TDM bytes and grid', () => {
  const tdm = readFileSync(path.join(appRoot, 'public/content/maps/td_map_04.tdm'));
  const { width, height } = map.map;

  assert.equal(map.id, 'tech-town');
  assert.equal(map.source.resource, 'res/raw/td_map_04.tdm');
  assert.deepEqual([...tdm.subarray(0, 2)], [width, height]);
  assert.equal(width, 32);
  assert.equal(height, 24);
  assert.equal(tdm.length, 2 + (width * height));
  assert.equal(map.originalTileGrid.length, height);

  for (let y = 0; y < height; y += 1) {
    assert.equal(map.originalTileGrid[y]?.length, width, `row ${y} has ${width} cells`);
    for (let x = 0; x < width; x += 1) {
      assert.equal(tdm[2 + (y * width) + x], map.originalTileGrid[y]?.[x], `TDM cell (${x}, ${y})`);
    }
  }
});

test('preserves all Tech Town entrance, exit, direction-field and object coordinates', () => {
  for (const [code, expected] of Object.entries(expectedCellsByCode)) {
    assert.deepEqual(
      coordinatesForCode(map.originalTileGrid, Number(code)),
      expected,
      `TDM code ${code} retains every original coordinate`,
    );
  }
});

test('decodes every fresh-game unit marker into its APK type and activity', () => {
  const unitMetadataByCode = {
    96: { unitTypeId: 1, activity: 4 },
    97: { unitTypeId: 2, activity: 4 },
    98: { unitTypeId: 3, activity: 4 },
    99: { unitTypeId: 4, activity: 4 },
    100: { unitTypeId: 5, activity: 4 },
    101: { unitTypeId: 6, activity: 4 },
    104: { unitTypeId: 1, activity: 5 },
    105: { unitTypeId: 2, activity: 5 },
    106: { unitTypeId: 3, activity: 5 },
    107: { unitTypeId: 4, activity: 5 },
    108: { unitTypeId: 5, activity: 5 },
    109: { unitTypeId: 6, activity: 5 },
    130: { unitTypeId: 35, activity: 4 },
    131: { unitTypeId: 36, activity: 4 },
    132: { unitTypeId: 9, activity: 5 },
  } as const;
  const allUnitCodes = Object.keys(unitMetadataByCode).map(Number);
  const decoded = createTechTownFreshGameUnitPlacements([[...allUnitCodes, 150]]);

  assert.deepEqual(decoded.map(({ sourceCode, unitTypeId, activity, cell }) => ({
    sourceCode,
    unitTypeId,
    activity,
    cell,
  })), Object.entries(unitMetadataByCode).map(([sourceCode, { unitTypeId, activity }], x) => ({
    sourceCode: Number(sourceCode),
    unitTypeId,
    activity,
    cell: { x, y: 0 },
  })));
});

test('places Tech Town units at every original map coordinate without treating Casino as a unit', () => {
  const expectedUnitMetadataByCode = {
    96: { unitTypeId: 1, activity: 4 },
    97: { unitTypeId: 2, activity: 4 },
    98: { unitTypeId: 3, activity: 4 },
    99: { unitTypeId: 4, activity: 4 },
    100: { unitTypeId: 5, activity: 4 },
    101: { unitTypeId: 6, activity: 4 },
    105: { unitTypeId: 2, activity: 5 },
    130: { unitTypeId: 35, activity: 4 },
    131: { unitTypeId: 36, activity: 4 },
    132: { unitTypeId: 9, activity: 5 },
  } as const;
  const expected = Object.entries(expectedUnitMetadataByCode).flatMap(([sourceCode, metadata]) => (
    expectedCellsByCode[Number(sourceCode)]!.map(([x, y]) => ({
      sourceCode: Number(sourceCode),
      ...metadata,
      cell: { x, y },
    }))
  )).sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);

  assert.deepEqual(createTechTownFreshGameUnitPlacements(), expected);
});

test('creates only unlocked ordinary Tech Town units on the first level-four visit', () => {
  const units = createTechTownBaseUnits((unitTypeId) => unitTypeId <= 4);
  const sleepingByType = {
    gunslinger: 96,
    mexican: 97,
    cannon: 98,
    indian: 99,
  } as const;

  assert.equal(units.length, 23);
  for (const [type, code] of Object.entries(sleepingByType)) {
    const sleepingUnits = units.filter((unit) => unit.type === type && unit.activity === 4);
    assert.deepEqual(sleepingUnits.map(({ cell }) => cell), expectedCellsByCode[code]!.map(([x, y]) => ({ x, y })));
  }
  assert.equal(units.some(({ type }) => type === 'sniper' || type === 'grandpa'), false);

  const activeMexican = units.find(({ type, activity }) => type === 'mexican' && activity === 5);
  assert.deepEqual(activeMexican?.cell, { x: 13, y: 11 });
  assert.equal(activeMexican?.asset, 'player_mexican');
  assert.equal(activeMexican?.weapon?.damage, 500);
});

test('restores marker units after their campaign unlock callback allows them', () => {
  const units = createTechTownBaseUnits(() => true);
  const sniper = units.filter(({ type }) => type === 'sniper');
  const grandpa = units.filter(({ type }) => type === 'grandpa');

  assert.equal(units.length, 27);
  assert.deepEqual(sniper.map(({ cell, activity }) => ({ cell, activity })), expectedCellsByCode[100]!.map(([x, y]) => ({
    cell: { x, y }, activity: 4,
  })));
  assert.deepEqual(grandpa.map(({ cell, activity }) => ({ cell, activity })), expectedCellsByCode[101]!.map(([x, y]) => ({
    cell: { x, y }, activity: 4,
  })));
});

test('reconstructs all four APK routes, including their directed railway crossings', () => {
  assert.deepEqual(techTownRouteDefinitions.map(({ spawn, redirects, exit }) => ({
    spawn: [spawn.cell.x, spawn.cell.y, spawn.direction],
    redirects: redirects.map(({ cell, directions }) => [cell.x, cell.y, directions[0]]),
    exit: [exit.x, exit.y],
  })), [
    {
      spawn: [0, 3, 'east'],
      redirects: [[8, 3, 'south'], [8, 9, 'east'], [11, 9, 'east'], [25, 9, 'south'], [25, 17, 'east']],
      exit: [31, 17],
    },
    {
      spawn: [0, 4, 'east'],
      redirects: [[7, 4, 'south'], [7, 10, 'east'], [12, 10, 'east'], [24, 10, 'south'], [24, 18, 'east']],
      exit: [31, 18],
    },
    {
      spawn: [11, 23, 'north'],
      redirects: [[11, 21, 'west'], [9, 21, 'north'], [9, 15, 'east'], [11, 15, 'north'], [11, 9, 'east'], [25, 9, 'south'], [25, 17, 'east']],
      exit: [31, 17],
    },
    {
      spawn: [12, 23, 'north'],
      redirects: [[12, 20, 'west'], [10, 20, 'north'], [10, 16, 'east'], [12, 16, 'north'], [12, 10, 'east'], [24, 10, 'south'], [24, 18, 'east']],
      exit: [31, 18],
    },
  ]);

  const railCrossings = techTownRouteDefinitions.map((route) =>
    expandRoute(route).filter(([x, y]) => {
      const code = map.originalTileGrid[y]?.[x] ?? 0;
      return code >= 80 && code <= 88;
    }));
  assert.deepEqual(railCrossings, [
    [[3, 3], [8, 6], [16, 9], [25, 12], [25, 14]],
    [[3, 4], [7, 6], [16, 10], [24, 12], [24, 14]],
    [[9, 18], [11, 12], [16, 9], [25, 12], [25, 14]],
    [[10, 18], [12, 12], [16, 10], [24, 12], [24, 14]],
  ]);

  const visitedDirectionFields = new Set<string>();
  for (const [routeIndex, route] of techTownRouteDefinitions.entries()) {
    assert.equal(
      map.originalTileGrid[route.spawn.cell.y]?.[route.spawn.cell.x],
      40 + routeIndex,
      'each route starts at the matching APK spawn field',
    );
    assert.equal(map.originalTileGrid[route.exit.y]?.[route.exit.x], 48, 'each route ends at an APK exit field');

    for (const redirect of route.redirects) {
      const code = map.originalTileGrid[redirect.cell.y]?.[redirect.cell.x];
      assert.ok(code !== undefined && code >= 52 && code <= 55, 'each redirect is an APK direction field');
      assert.deepEqual(redirect.directions, [directionByCode[code as keyof typeof directionByCode]]);
      visitedDirectionFields.add(`${redirect.cell.x},${redirect.cell.y}`);
    }

    assert.ok(expandRoute(route).length > 1, 'each spawn has a complete route to an exit');
  }

  assert.deepEqual(
    [...visitedDirectionFields].sort(),
    [52, 53, 54, 55].flatMap((code) => coordinatesForCode(map.originalTileGrid, code).map(([x, y]) => `${x},${y}`)).sort(),
    'the four route graphs account for every raw direction field',
  );
});

test('restores APK-derived Tech Town terrain, path, rail and bridge layers', () => {
  const scene = createTechTownMapScene();
  const expected = deriveOriginalTdmMapDrawCommands(map);

  assert.deepEqual(scene.background, expected.background);
  assert.deepEqual(scene.streets, expected.streets);
  assert.equal(scene.background.length, 32 * 24);
  assert.equal(scene.streets.filter(({ asset }) => asset === 'tiles_railway_hori').length, 28);
  assert.equal(scene.streets.filter(({ asset }) => asset === 'tiles_railway_verti').length, 0);
  assert.equal(scene.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 6);
  assert.equal(scene.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length, 6);
  assert.ok(scene.streets.some(({ asset }) => asset === 'tiles_path_var'));
});

test('places every known Tech Town static object at its APK code and anchor', () => {
  const scene = createTechTownMapScene();
  const assetsByCode: Readonly<Record<number, string>> = {
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
    86: 'tiles_railway_buffers_hori_left',
    87: 'tiles_railway_buffers_hori_right',
    112: 'b_3x2_saloon',
    113: 'b_3x2_fort',
    114: 'b_2x1_tipi',
    116: 'b_2x1_shack',
    117: 'b_1x1_tipi_small',
    126: 'e_1x1_rocks_water',
  };
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    assetsByCode[code] ? [{ asset: assetsByCode[code]!, cell: { x, y } }] : []
  )));

  assert.deepEqual(scene.decorations?.map(({ asset, cell }) => ({ asset, cell })), expected);
  assert.equal(scene.decorations?.length, 52);
  assert.equal(scene.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), false);

  const saloon = scene.decorations?.find(({ asset }) => asset === 'b_3x2_saloon');
  const fort = scene.decorations?.find(({ asset }) => asset === 'b_3x2_fort');
  const tipi = scene.decorations?.find(({ asset }) => asset === 'b_2x1_tipi');
  const shack = scene.decorations?.find(({ asset }) => asset === 'b_2x1_shack');
  assert.equal(saloon?.anchorOffsetY, -0.3);
  assert.equal(fort?.anchorOffsetY, -0.3);
  assert.deepEqual({ x: tipi?.anchorOffsetX, y: tipi?.anchorOffsetY }, { x: -0.5, y: -0.3 });
  assert.equal(shack?.anchorOffsetX, -0.5);

  const unlockedScene = createTechTownMapScene({ gamblerUnlocked: true });
  const casino = unlockedScene.decorations?.find(({ asset }) => asset === 'b_3x2_casino');
  assert.deepEqual(casino?.cell, { x: 30, y: 3 });
  assert.equal(casino?.anchorOffsetY, -0.3);
});

test('bundles every Tech Town scene image from the APK at its original logical scale', () => {
  const scene = createTechTownMapScene();
  const unlockedScene = createTechTownMapScene({ gamblerUnlocked: true });
  const assets = new Set([
    ...scene.background.map(({ asset }) => asset),
    ...scene.streets.map(({ asset }) => asset),
    ...(scene.decorations ?? []).map(({ asset }) => asset),
    ...(unlockedScene.decorations ?? []).map(({ asset }) => asset),
  ]);
  const decorationAssets = new Set([
    ...(scene.decorations ?? []).map(({ asset }) => asset),
    ...(unlockedScene.decorations ?? []).map(({ asset }) => asset),
  ]);
  for (const asset of assets) {
    const relativePath = gameAssetRelativePath(asset);
    const bytes = readFileSync(path.join(appRoot, 'public/assets', relativePath));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `asset ${asset} is a PNG`);
    assert.match(relativePath, /^hdpi\//, `asset ${asset} retains APK density`);
    if (decorationAssets.has(asset)) {
      const sourceSize = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
      assert.deepEqual(gameAssetLogicalSize(asset, sourceSize), {
        width: sourceSize.width * (2 / 3),
        height: sourceSize.height * (2 / 3),
      }, `${asset} converts APK hdpi pixels to mdpi game dimensions`);
    }
  }

  assert.deepEqual(gameAssetLogicalSize('b_3x2_saloon', { width: 120, height: 120 }), { width: 80, height: 80 });
  assert.deepEqual(gameAssetLogicalSize('b_3x2_casino', { width: 120, height: 120 }), { width: 80, height: 80 });
  assert.deepEqual(gameAssetLogicalSize('b_2x1_tipi', { width: 84, height: 108 }), { width: 56, height: 72 });
  assert.deepEqual(gameAssetLogicalSize('tiles_railway_buffers_hori_left', { width: 48, height: 48 }), { width: 32, height: 32 });
  assert.equal(gameAssetSourceScale('tiles_railway_hori'), 1.5);
});
