import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createGame, type Direction, type PreviewWaveDefinition } from '../src/game';
import map from '../src/content/oregon-10.json';
import { createOregon09CampaignContent } from '../src/content/oregon-09-campaign';
import routeGraph from './fixtures/oregon-10-route-graph.json';
import { createOregon10MapScene } from '../src/content/oregon-10-scene';
import { oregon10RouteDefinitions, oregon10SpawnPointIdByActionId } from '../src/content/oregon-10-routes';
import { createOregon10MapContent } from '../src/content/oregon-10-map-entities';
import { createOregon10DynamiteFromUnlock } from '../src/content/oregon-10-dynamite';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import { createPlayerMapCollisionBoxes, PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE } from '../src/game/player-collision-geometry';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const oregonAtlasAliases: Readonly<Record<string, string>> = Object.freeze({
  tiles_canyon: 'miss_tiles_canyon',
  tiles_canyon_wall_var: 'miss_tiles_canyon_wall_var',
  tiles_desert: 'miss_tiles_desert',
  tiles_desert_var: 'miss_tiles_desert_var',
  tiles_waterside: 'miss_tiles_waterside',
  tiles_waterside_var: 'miss_tiles_waterside_var',
  tiles_path: 'miss_tiles_path',
  tiles_path_var: 'miss_tiles_path_var',
});

const sceneryByCode: Readonly<Record<number, string>> = Object.freeze({
  70: 'e_1x1_rocks_b',
  75: 'b_1x1_watertower',
  86: 'tiles_railway_buffers_hori_left',
  87: 'tiles_railway_buffers_hori_right',
  112: 'b_3x2_saloon',
  113: 'b_3x2_fort',
  114: 'b_2x1_tipi',
  118: 'e_1x1_tree_stump',
});

function applyOregonAtlases<T extends { asset: string }>(tiles: readonly T[]): T[] {
  return tiles.map((tile) => ({ ...tile, asset: oregonAtlasAliases[tile.asset] ?? tile.asset }));
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function cellKeysForCode(grid: readonly (readonly number[])[], code: number): string[] {
  return grid.flatMap((row, y) => row.flatMap((value, x) => value === code ? [cellKey({ x, y })] : []));
}

function pngDimensions(filePath: string): { width: number; height: number } {
  const png = readFileSync(filePath);
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} is a PNG`);
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function unitsUnlocked() {
  return () => true;
}

test('Lumber Mill Hills raw TDM, Oregon layers, collision grid, and bundled atlas regions match independent references', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_33.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'lumber-mill-hills');
  assert.equal(map.source.resource, 'res/raw/td_map_33.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 384, 16: 59, 32: 121, 36: 63, 40: 1, 41: 1, 42: 1, 43: 1,
    48: 4, 52: 6, 53: 5, 54: 13, 70: 2, 75: 1, 82: 13, 83: 2, 84: 3,
    86: 1, 87: 1, 88: 18, 96: 1, 97: 1, 98: 1, 99: 1, 100: 1, 101: 2,
    102: 2, 110: 2, 112: 1, 113: 1, 114: 1, 118: 52, 130: 1, 131: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, applyOregonAtlases(expected.background));
  assert.deepEqual(map.map.streets, applyOregonAtlases(expected.streets));
  assert.equal(map.map.background.length, 32 * 24);

  const scene = createOregon10MapScene();
  assert.deepEqual(scene.backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
  assert.equal(scene.backgroundCollisionCodes?.length, 24);
  assert.ok(scene.backgroundCollisionCodes?.every((row) => row.length === 32 && row.every(Number.isInteger)));

  for (const asset of new Set([...map.map.background, ...map.map.streets].map(({ asset }) => asset))) {
    const assetPath = path.join(appRoot, 'public/assets', gameAssetRelativePath(asset));
    assert.ok(existsSync(assetPath), `${asset} is bundled`);
    const { width, height } = pngDimensions(assetPath);
    const sourceScale = gameAssetSourceScale(asset);
    for (const tile of [...map.map.background, ...map.map.streets].filter((item) => item.asset === asset)) {
      assert.ok(tile.source.x >= 0 && tile.source.y >= 0, `${asset} source origin is nonnegative`);
      assert.ok(tile.source.x + tile.source.width <= width / sourceScale, `${asset} source x-range is in atlas`);
      assert.ok(tile.source.y + tile.source.height <= height / sourceScale, `${asset} source y-range is in atlas`);
    }
  }
});

test('Lumber Mill Hills routes match the independent APK graph and runtime redirect markers', () => {
  assert.deepEqual(routeGraph.dimensions, [map.map.width, map.map.height]);
  const spawnActionIds = map.originalTileGrid.flatMap((row) => row
    .filter((code) => code >= 40 && code <= 46)
    .map((code) => code - 40));
  assert.deepEqual(oregon10SpawnPointIdByActionId, Object.fromEntries(
    spawnActionIds.map((actionId, spawnPointId) => [actionId, spawnPointId]),
  ));
  assert.deepEqual(routeGraph.spawns.map(({ actionId, cell, direction }) => [actionId, cell, direction]), [
    [0, [27, 0], [0, 1]], [1, [31, 7], [-1, 0]], [2, [31, 17], [-1, 0]], [3, [22, 23], [0, -1]],
  ]);

  const actualEdges = new Set<string>();
  for (const route of oregon10RouteDefinitions) {
    const cells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    let direction: Direction = route.spawn.direction;
    for (let index = 1; index < cells.length; index += 1) {
      const from = cells[index - 1]!;
      const to = cells[index]!;
      actualEdges.add(`${cellKey(from)}:${direction}->${cellKey(to)}`);
      const redirect = route.redirects[index - 1];
      if (redirect) direction = redirect.directions[0]!;
    }
  }
  assert.equal(routeGraph.edges.length, 28);
  assert.deepEqual([...actualEdges].sort(), [...routeGraph.edges].sort());

  const firstRoute = oregon10RouteDefinitions[0]!;
  const preview: PreviewWaveDefinition = {
    number: 1,
    initialLives: 1,
    spawn: firstRoute.spawn,
    routes: oregon10RouteDefinitions,
    baseEnemySpeed: 1,
    speedMultiplierMin: 1,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: firstRoute.redirects,
    exit: firstRoute.exit,
  };
  const directionsByAction: readonly (readonly Direction[])[] = [
    ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
    ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
    ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
    ['south', 'north', 'west'],
  ];
  const expectedRuntimeRedirects = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 52 && code <= 65 ? [`${cellKey({ x, y })}:${directionsByAction[code - 52]!.join('/')}`] : []
  ))).sort();
  const actualRuntimeRedirects = runtimeWaveRedirects(preview, map.originalTileGrid)
    .map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`).sort();
  assert.deepEqual(actualRuntimeRedirects, expectedRuntimeRedirects);
});

test('Lumber Mill Hills GameSession follows an APK route turn from its mapped spawn', async () => {
  const base = createOregon09CampaignContent([]);
  const routes = oregon10RouteDefinitions;
  const uniqueSpawns = [...new Map(routes.map(({ spawn }) => [
    `${cellKey(spawn.cell)}:${spawn.direction}`, spawn,
  ])).values()];
  const uniqueExits = [...new Map(routes.map(({ exit }) => [cellKey(exit), exit])).values()];
  const firstRoute = routes.find(({ spawn }) => cellKey(spawn.cell) === '27,0');
  assert.ok(firstRoute, 'the first APK action spawn at (27,0) has a complete route');

  const scenarioId = 'map-test-lumber-mill-hills-route';
  const scenario = {
    ...base,
    id: scenarioId,
    units: [],
    map: createOregon10MapScene(),
    originalTileGrid: map.originalTileGrid,
    dynamite: createOregon10DynamiteFromUnlock(false),
    previewWave: {
      ...base.previewWave!,
      number: 1,
      baseEnemySpeed: 1_500,
      speedMultiplierMin: 100,
      speedMultiplierCount: 1,
      spawn: uniqueSpawns[0]!,
      additionalSpawns: uniqueSpawns.slice(1),
      routes,
      redirects: firstRoute.redirects,
      exit: firstRoute.exit,
      additionalExits: uniqueExits.slice(1),
    },
  };
  const session = await createGame({ scenarios: { [scenarioId]: scenario } }).open({
    scenarioId,
    mode: 'debug',
    randomSeed: 3010,
  });

  try {
    assert.equal(session.submitIntent({ type: 'start-wave' }), true);
    let view = session.observe();
    const trackedEnemyId = 'preview-pioneer-1';
    const trackedEnemy = () => view.enemies.find(({ id }) => id === trackedEnemyId);
    for (let frame = 0; frame < 100 && trackedEnemy()?.direction !== 'west'; frame += 1) {
      view = session.advance({ deltaMs: 100 });
    }
    const turnedEnemy = trackedEnemy();
    assert.ok(turnedEnemy, 'the enemy reaches the first APK turn instead of following only the initial direction');
    assert.ok(Math.abs(turnedEnemy.positionFine.x - Math.trunc(27.5 * 7_680)) <= 4);
    assert.ok(Math.abs(turnedEnemy.positionFine.y - Math.trunc(3.5 * 7_680)) <= 4);
  } finally {
    session.close();
  }
});

test('Lumber Mill Hills Dynamite trigger and box markers keep the APK pair and unlock gate', () => {
  const locked = createOregon10DynamiteFromUnlock(false);
  assert.equal(locked.unlocked, false);
  assert.deepEqual(locked.pairs.map(({ triggerCell, boxCell }) => [
    cellKey(triggerCell), cellKey(boxCell),
  ]), [['4,2', '4,4'], ['5,16', '5,18']]);

  const unlocked = createOregon10DynamiteFromUnlock(true);
  assert.equal(unlocked.unlocked, true);
  assert.deepEqual(unlocked.pairs, locked.pairs);
});

test('Lumber Mill Hills scenery and hire/train units retain each APK marker and collision source', () => {
  const scene = createOregon10MapScene();
  const expectedDecorations = Object.entries(sceneryByCode).flatMap(([rawCode, asset]) => {
    const code = Number(rawCode);
    return map.originalTileGrid.flatMap((row, y) => row.flatMap((value, x) => (
      value === code ? [`${cellKey({ x, y })}:${asset}`] : []
    )));
  }).sort();
  const actualDecorations = (scene.decorations ?? []).map(({ cell, asset }) => `${cellKey(cell)}:${asset}`).sort();
  assert.deepEqual(actualDecorations, expectedDecorations);

  const allUnits = createOregon10MapContent(unitsUnlocked()).units;
  const mapUnits = allUnits.filter(({ movementGroupId }) => !movementGroupId?.startsWith('oregon-10-train-'));
  const expectedHireCells: Readonly<Record<number, readonly string[]>> = {
    96: ['22,11'], 97: ['26,11'], 98: ['4,13'], 99: ['13,3'], 100: ['13,12'],
    101: ['7,8', '17,13'], 130: ['31,14'], 131: ['10,19'],
  };
  const placements = mapUnits.map(({ type, activity, cell }) => `${type}:${activity}:${cellKey(cell)}`).sort();
  const expectedUnits = Object.entries(expectedHireCells).flatMap(([rawCode, cells]) => {
    const code = Number(rawCode);
    const typeByCode: Readonly<Record<number, string>> = {
      96: 'gunslinger', 97: 'mexican', 98: 'cannon', 99: 'indian', 100: 'sniper', 101: 'grandpa',
      130: 'pyromaniac', 131: 'salesman',
    };
    return cells.map((cell) => `${typeByCode[code]}:4:${cell}`);
  }).sort();
  assert.deepEqual(placements, expectedUnits);
  assert.equal(new Set(allUnits.map(({ id }) => id)).size, allUnits.length);

  const trains = allUnits.filter(({ movementGroupId }) => movementGroupId?.startsWith('oregon-10-train-'));
  assert.deepEqual(trains.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]), [
    ['train-10', 5, 7, 22], ['train-11', 5, 8, 22], ['train-12', 4, 9, 22],
    ['train-12', 4, 10, 22], ['train-12', 4, 11, 22],
  ]);
  assert.deepEqual(new Set(trains.map(({ movementGroupId }) => movementGroupId)), new Set(['oregon-10-train-1']));

  for (const unit of allUnits) {
    for (const asset of [unit.asset, unit.awakeAsset].filter((name): name is string => name !== undefined)) {
      assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
    }
  }
  for (const { asset } of scene.decorations ?? []) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), `${asset} is bundled`);
  }

  const dynamite = createOregon10DynamiteFromUnlock(true);
  const collisionBoxes = createPlayerMapCollisionBoxes(map.originalTileGrid, scene.decorations ?? [], dynamite);
  for (const [rawCode, relativeBounds] of Object.entries(PLAYER_STATIC_COLLISION_BOUNDS_BY_TDM_CODE)) {
    const code = Number(rawCode);
    for (const markerCell of cellKeysForCode(map.originalTileGrid, code)) {
      const [x, y] = markerCell.split(',').map(Number);
      const matching = collisionBoxes.filter(({ sourceCell, sourceTdmCode }) => (
        sourceTdmCode === code && sourceCell?.x === x && sourceCell.y === y
      ));
      assert.equal(matching.length, 1, `raw TDM ${code} at ${markerCell} has one original collision object`);
      assert.deepEqual(matching[0], {
        x: (x! * 7_680) + relativeBounds.x,
        y: (y! * 7_680) + relativeBounds.y,
        width: relativeBounds.width,
        height: relativeBounds.height,
        sourceCell: { x, y },
        sourceTdmCode: code,
      });
    }
  }
});
