import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-04.json';
import { createDakotaBackgroundCollisionCodes } from '../src/content/dakota-background-collision';
import { dakota04RouteDefinitions, dakota04SpawnPointIdByActionId } from '../src/content/dakota-04-routes';
import { createGame, type Direction, type PreviewWaveDefinition, type ScenarioContent } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';
import routeGraph from './fixtures/badlands-route-graph.json';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';

const appRoot = path.resolve(import.meta.dirname, '..');
const FINE_UNITS_PER_CELL = 7_680;
const directionsByAction: readonly (readonly Direction[])[] = [
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
];

function vectorForDirection(direction: Direction): readonly [number, number] {
  if (direction === 'north') return [0, -1];
  if (direction === 'south') return [0, 1];
  if (direction === 'west') return [-1, 0];
  return [1, 0];
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function sortedJson(values: readonly unknown[]): string[] {
  return values.map((value) => JSON.stringify(value)).sort();
}

function uniqueSpawns() {
  return [...new Map(dakota04RouteDefinitions.map(({ spawn }) => [
    `${cellKey(spawn.cell)}:${spawn.direction}`, spawn,
  ])).values()];
}

function uniqueExits() {
  return [...new Map(dakota04RouteDefinitions.map(({ exit }) => [cellKey(exit), exit])).values()];
}

function routeEdges(): string[] {
  return dakota04RouteDefinitions.flatMap((route) => {
    let from = route.spawn.cell;
    let direction = route.spawn.direction;
    const edges: string[] = [];
    for (const redirect of route.redirects) {
      edges.push(`${cellKey(from)}:${direction}->${cellKey(redirect.cell)}`);
      from = redirect.cell;
      direction = redirect.directions[0]!;
    }
    edges.push(`${cellKey(from)}:${direction}->${cellKey(route.exit)}`);
    return edges;
  });
}

function createRouteScenario(): ScenarioContent {
  const routes = dakota04RouteDefinitions;
  const spawns = uniqueSpawns();
  const exits = uniqueExits();
  const first = routes[0]!;
  const previewWave: PreviewWaveDefinition = {
    number: 1,
    initialLives: 25,
    initialCash: 250,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 100, medium: 100, hard: 100 },
    enemy: {
      hitPoints: 1,
      cashReward: 0,
      penetration: { light: 0, fire: 0, heavy: 0, poison: 0 },
    },
    spawn: spawns[0]!,
    additionalSpawns: spawns.slice(1),
    routes,
    baseEnemySpeed: 500,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: first.redirects,
    exit: first.exit,
    additionalExits: exits.slice(1),
  };

  return {
    id: 'badlands-route-test',
    formalSettlementSupported: true,
    title: { en: 'Badlands route test', zh: '荒原路线测试' },
    map: {
      ...map.map,
      originalTileGrid: map.originalTileGrid,
      backgroundCollisionCodes: createDakotaBackgroundCollisionCodes(map.map),
    },
    originalTileGrid: map.originalTileGrid,
    units: [],
    previewWave,
  };
}

test('Badlands map37 fixture, marker frequencies, and dimensions match the APK TDM', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_37.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'badlands');
  assert.equal(map.source.resource, 'res/raw/td_map_37.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 358, 32: 117, 36: 95, 40: 1, 41: 1, 42: 1, 48: 3, 52: 4, 53: 11, 54: 28,
    56: 2, 58: 7, 60: 2, 69: 6, 70: 4, 71: 5, 75: 1, 76: 3, 80: 5, 88: 24,
    89: 6, 90: 10, 91: 2, 92: 2, 94: 1, 95: 1, 96: 13, 97: 21, 98: 15, 99: 5,
    100: 1, 101: 5, 102: 1, 110: 1, 116: 1, 124: 3, 130: 1, 131: 1,
  });
});

test('Badlands Dakota draw commands and final collision grid match APK-derived map37 references', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_37.tdm'));
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));
  const expected = deriveOriginalTdmMapDrawCommands({ originalTileGrid: apkGrid });
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.equal(map.map.background.length, 768);
  assert.equal(map.map.streets.length, 59);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 5);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length, 24);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_railway_verti').length, 20);
  assert.deepEqual(createDakotaBackgroundCollisionCodes(map.map), deriveOriginalBackgroundCodesForTest({
    originalTileGrid: apkGrid,
    map: { ...map.map, background: expected.background, streets: expected.streets },
  }));

  const collision = createDakotaBackgroundCollisionCodes(map.map);
  assert.equal(map.originalTileGrid[0]![14], 36);
  assert.equal(collision[0]![14], 12, 'a cliff-wall raw tile becomes its shaped blocking canyon code');
  assert.equal(map.originalTileGrid[2]![22], 80);
  assert.equal(collision[2]![22], 75, 'the horizontal bridge remains a distinct walkable background surface');
  assert.equal(map.originalTileGrid[3]![24], 88);
  assert.equal(collision[3]![24], 23, 'the vertical bridge sprite overlays its shaped base surface');
  assert.equal(map.originalTileGrid[0]![0], 124);
  assert.equal(collision[0]![0], 96, 'water stays separate from the bridge and canyon collision codes');

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

test('Badlands route nodes, action mapping, 68 directed edges, and every route cell match the APK graph', () => {
  assert.deepEqual(routeGraph.dimensions, [32, 24]);
  assert.equal(routeGraph.resource, map.source.resource);
  assert.deepEqual(routeGraph.summary, {
    spawnCount: 3,
    redirectCount: 54,
    exitCount: 3,
    reachableRedirectorCount: 54,
    reachableExitCount: 3,
    edgeCount: 68,
    pathCount: 37,
  });

  const actualNodes = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    if (code >= 40 && code <= 46) return [[1, code - 40, x, y]];
    if (code >= 52 && code <= 65) return [[2, code - 52, x, y]];
    if (code === 48) return [[3, 0, x, y]];
    return [];
  }));
  assert.deepEqual(sortedJson(actualNodes), sortedJson(routeGraph.nodes));
  assert.equal(dakota04RouteDefinitions.length, routeGraph.summary.pathCount);

  const rowMajorSpawns = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [{ actionId: code - 40, cell: [x, y] }] : []
  )));
  assert.deepEqual(dakota04SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2 });
  assert.deepEqual(rowMajorSpawns.map(({ actionId, cell }, spawnPointId) => [actionId, cell, spawnPointId]),
    routeGraph.spawns.map(({ actionId, cell, spawnPointId }) => [actionId, cell, spawnPointId]));
  assert.deepEqual(routeGraph.spawns.map(({ actionId, direction, firstControlCell }) => [
    actionId,
    direction,
    firstControlCell,
  ]), [
    [0, [-1, 0], [26, 6]],
    [1, [-1, 0], [27, 12]],
    [2, [-1, 0], [29, 20]],
  ]);

  const actualEdges = [...new Set(routeEdges())].sort();
  assert.equal(actualEdges.length, 68);
  assert.deepEqual(actualEdges, routeGraph.edges);
  const routeRedirects = dakota04RouteDefinitions.flatMap(({ redirects }) => redirects);
  assert.equal(new Set(routeRedirects.map(({ cell }) => cellKey(cell))).size, 54);
  assert.deepEqual(uniqueExits().map(cellKey).sort(), ['0,13', '0,18', '0,8']);

  const routeCells = new Set<string>();
  for (const route of dakota04RouteDefinitions) {
    let cell = route.spawn.cell;
    let direction = route.spawn.direction;
    const targets = [...route.redirects.map(({ cell: target }) => target), route.exit];
    for (const target of targets) {
      const [dx, dy] = vectorForDirection(direction);
      const steps = Math.abs(target.x - cell.x) + Math.abs(target.y - cell.y);
      assert.ok(steps > 0, `route edge from ${cellKey(cell)} advances`);
      assert.ok((dx === 0 ? target.x === cell.x : target.y === cell.y), 'route edge follows its direction');
      for (let step = 0; step <= steps; step += 1) routeCells.add(`${cell.x + (dx * step)},${cell.y + (dy * step)}`);
      cell = target;
      const redirect = route.redirects.find(({ cell: redirectCell }) => cellKey(redirectCell) === cellKey(target));
      if (redirect) direction = redirect.directions[0]!;
    }
  }
  assert.equal(routeCells.size, 195);
  const routeCodes = [...routeCells].map((key) => {
    const [x, y] = key.split(',').map(Number);
    return map.originalTileGrid[y!]![x!]!;
  });
  assert.deepEqual({
    cliff: routeCodes.filter((code) => code === 36).length,
    horizontalBridge: routeCodes.filter((code) => code === 80).length,
    verticalBridge: routeCodes.filter((code) => code === 88).length,
    rail: routeCodes.filter((code) => code === 89).length,
    corridor: routeCodes.filter((code) => code === 32).length,
    exits: routeCodes.filter((code) => code === 48).length,
  }, { cliff: 0, horizontalBridge: 5, verticalBridge: 12, rail: 3, corridor: 115, exits: 3 });
});

test('Badlands runtime route projection preserves APK action directions', () => {
  const preview = createRouteScenario().previewWave!;
  const expected = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 52 && code <= 65 ? [`${x},${y}:${directionsByAction[code - 52]!.join('/')}`] : []
  ))).sort();
  const actual = runtimeWaveRedirects(preview, map.originalTileGrid)
    .map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`).sort();
  assert.deepEqual(actual, expected);
});

test('Badlands short GameSession sends all three spawn actions toward their first APK control point', async () => {
  const scenario = createRouteScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 37_034,
  });

  try {
    assert.equal(session.submitIntent({ type: 'start-wave' }), true);
    let view = session.advance({ deltaMs: 100 });
    const turned = new Set<number>();
    for (let frame = 0; frame < 240 && turned.size < routeGraph.spawns.length; frame += 1) {
      for (const spawn of routeGraph.spawns) {
        if (turned.has(spawn.spawnPointId)) continue;
        const enemy = view.enemies.find(({ id }) => id === `preview-pioneer-${spawn.spawnPointId + 1}`);
        if (!enemy || enemy.direction === 'west') continue;
        const [x, y] = spawn.firstControlCell;
        const expectedDirections = directionsByAction[map.originalTileGrid[y]![x]! - 52]!
          .map((direction) => direction);
        assert.ok(expectedDirections.includes(enemy.direction), `spawn action ${spawn.actionId} takes a legal first turn`);
        assert.ok(Math.abs(enemy.positionFine.x - ((x + 0.5) * FINE_UNITS_PER_CELL)) <= FINE_UNITS_PER_CELL);
        assert.ok(Math.abs(enemy.positionFine.y - ((y + 0.5) * FINE_UNITS_PER_CELL)) <= FINE_UNITS_PER_CELL);
        turned.add(spawn.spawnPointId);
      }
      if (turned.size < routeGraph.spawns.length) view = session.advance({ deltaMs: 100 });
    }
    assert.deepEqual([...turned].sort(), [0, 1, 2], JSON.stringify({ enemies: view.enemies }));
  } finally {
    session.close();
  }
});
