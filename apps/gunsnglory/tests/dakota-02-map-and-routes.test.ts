import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import map from '../src/content/dakota-02.json';
import { dakota02RouteDefinitions, dakota02SpawnPointIdByActionId } from '../src/content/dakota-02-routes';
import { createDakota02MapScene } from '../src/content/dakota-02-scene';
import { createGame, type Direction, type PreviewWaveDefinition, type ScenarioContent } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import routeGraph from './fixtures/six-grandfathers-route-graph.json';
import { deriveOriginalBackgroundCodesForTest, deriveOriginalTdmMapDrawCommands } from './helpers/terrain-render-reference';
import { gameAssetRelativePath, gameAssetSourceScale } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

const directionsByAction: readonly (readonly Direction[])[] = [
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
];

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function vectorForDirection(direction: Direction): [number, number] {
  if (direction === 'north') return [0, -1];
  if (direction === 'south') return [0, 1];
  if (direction === 'west') return [-1, 0];
  return [1, 0];
}

function uniqueSpawns() {
  return [...new Map(dakota02RouteDefinitions.map(({ spawn }) => [
    `${cellKey(spawn.cell)}:${spawn.direction}`, spawn,
  ])).values()];
}

function uniqueExits() {
  return [...new Map(dakota02RouteDefinitions.map(({ exit }) => [cellKey(exit), exit])).values()];
}

function sortedJson(values: readonly unknown[]): string[] {
  return values.map((value) => JSON.stringify(value)).sort();
}

function addSegmentCells(
  cells: Set<string>,
  from: readonly [number, number],
  direction: readonly [number, number],
  steps: number,
): void {
  for (let step = 0; step <= steps; step += 1) {
    cells.add(`${from[0] + (direction[0] * step)},${from[1] + (direction[1] * step)}`);
  }
}

function routeEdges() {
  return dakota02RouteDefinitions.flatMap((route) => {
    let current = route.spawn.cell;
    let direction = vectorForDirection(route.spawn.direction);
    const edges: number[][] = [];

    for (const redirect of route.redirects) {
      const dx = redirect.cell.x - current.x;
      const dy = redirect.cell.y - current.y;
      const steps = Math.abs(dx) + Math.abs(dy);
      edges.push([current.x, current.y, direction[0], direction[1], redirect.cell.x, redirect.cell.y, steps]);
      current = redirect.cell;
      direction = vectorForDirection(redirect.directions[0]!);
    }

    const dx = route.exit.x - current.x;
    const dy = route.exit.y - current.y;
    const steps = Math.abs(dx) + Math.abs(dy);
    edges.push([current.x, current.y, direction[0], direction[1], route.exit.x, route.exit.y, steps]);
    return edges;
  });
}

function createRouteTestScenario(): ScenarioContent {
  const spawns = uniqueSpawns();
  const exits = uniqueExits();
  const firstRoute = dakota02RouteDefinitions[0]!;
  const previewWave: PreviewWaveDefinition = {
    number: 1,
    initialLives: 25,
    initialCash: 250,
    spawn: spawns[0]!,
    additionalSpawns: spawns.slice(1),
    routes: dakota02RouteDefinitions,
    baseEnemySpeed: 600,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: firstRoute.redirects,
    exit: firstRoute.exit,
    additionalExits: exits.slice(1),
  };

  return {
    id: 'six-grandfathers-route-test',
    formalSettlementSupported: true,
    title: { en: 'Six Grandfathers route test', zh: '六祖父山路线测试' },
    map: {
      ...map.map,
      originalTileGrid: map.originalTileGrid,
      backgroundCollisionCodes: deriveOriginalBackgroundCodesForTest(map),
    },
    originalTileGrid: map.originalTileGrid,
    units: [],
    previewWave,
    campaignWaveCount: 1,
    campaignWaves: [{
      number: 1,
      delayMs: 0,
      hitPointMultiplierPercent: 100,
      speedMultiplierPercent: 100,
      spawnPools: spawns.map((_, spawnPointId) => ({
        spawnPointId,
        intervalMs: 0,
        requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      })),
    }],
  };
}

test('Six Grandfathers TDM and Dakota render commands match APK-derived independent references', () => {
  const bytes = readFileSync(path.join(appRoot, 'tests/fixtures/td_map_35.tdm'));
  assert.equal(bytes.length, 770);
  assert.deepEqual([...bytes.subarray(0, 2)], [32, 24]);
  const apkGrid = Array.from({ length: 24 }, (_, y) => Array.from(bytes.subarray(2 + (y * 32), 2 + ((y + 1) * 32))));

  assert.equal(map.id, 'six-grandfathers');
  assert.equal(map.source.resource, 'res/raw/td_map_35.tdm');
  assert.deepEqual([map.map.width, map.map.height, map.map.tileSize], [32, 24, 32]);
  assert.deepEqual(map.originalTileGrid, apkGrid);
  assert.equal(map.originalTileGrid.flat().length, 768);
  assert.deepEqual(Object.fromEntries([...new Set(apkGrid.flat())].sort((a, b) => a - b).map((code) => [
    code,
    apkGrid.flat().filter((tile) => tile === code).length,
  ])), {
    0: 348, 16: 79, 32: 109, 36: 53, 40: 1, 41: 1, 42: 1, 48: 3,
    52: 6, 53: 13, 54: 22, 58: 1, 60: 1, 69: 6, 70: 2, 71: 5, 72: 1,
    75: 1, 76: 9, 80: 1, 82: 12, 83: 2, 84: 4, 86: 1, 87: 1, 88: 4,
    96: 14, 97: 11, 98: 8, 99: 6, 100: 1, 101: 6, 112: 1, 114: 1,
    117: 4, 124: 26, 126: 1, 130: 1, 131: 1,
  });

  const expected = deriveOriginalTdmMapDrawCommands(map);
  assert.deepEqual(map.map.background, expected.background);
  assert.deepEqual(map.map.streets, expected.streets);
  assert.deepEqual(createDakota02MapScene().backgroundCollisionCodes, deriveOriginalBackgroundCodesForTest(map));
  assert.equal(map.map.background.length, 32 * 24);
  assert.ok([...map.map.background, ...map.map.streets].every(({ asset }) => !asset.startsWith('miss_tiles_')));
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_hori').length, 1);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_bridge_verti').length, 4);
  assert.equal(map.map.streets.filter(({ asset }) => asset === 'tiles_railway_hori').length, 18);

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

test('Six Grandfathers routes match every APK node, unique directed edge, and runtime marker', () => {
  assert.deepEqual(routeGraph.dimensions, [map.map.width, map.map.height]);
  assert.equal(routeGraph.resource, map.source.resource);

  const actualNodes = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => {
    if (code >= 40 && code <= 46) return [[1, code - 40, x, y]];
    if (code >= 52 && code <= 65) return [[2, code - 52, x, y]];
    if (code === 48) return [[3, 0, x, y]];
    return [];
  }));
  assert.deepEqual(sortedJson(actualNodes), sortedJson(routeGraph.nodes));
  assert.deepEqual(routeGraph.summary, {
    spawnCount: 3,
    redirectCount: 43,
    exitCount: 3,
    reachableRedirectorCount: 43,
    reachableExitCount: 3,
    edgeCount: 48,
  });

  const rowMajorSpawns = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46 ? [{ actionId: code - 40, cell: { x, y } }] : []
  )));
  assert.deepEqual(dakota02SpawnPointIdByActionId, { 0: 1, 1: 2, 2: 0 });
  assert.deepEqual(Object.fromEntries(rowMajorSpawns.map(({ actionId }, spawnPointId) => [actionId, spawnPointId])), {
    0: 1, 1: 2, 2: 0,
  });
  assert.deepEqual(rowMajorSpawns.map(({ actionId, cell }) => [
    actionId, cell.x, cell.y,
  ]), routeGraph.spawns.map(([actionId, x, y]) => [actionId, x, y]));

  const expectedEdges = new Set(sortedJson(routeGraph.edges));
  const actualEdges = new Set(sortedJson(routeEdges()));
  assert.equal(expectedEdges.size, 48);
  assert.deepEqual([...actualEdges].sort(), [...expectedEdges].sort());

  const expectedCells = new Set<string>();
  for (const [x, y, dx, dy, , , steps] of routeGraph.edges) {
    addSegmentCells(expectedCells, [x, y], [dx, dy], steps);
  }
  const actualCells = new Set<string>();
  for (const [x, y, dx, dy, , , steps] of routeEdges()) {
    addSegmentCells(actualCells, [x, y], [dx, dy], steps);
  }
  assert.deepEqual([...actualCells].sort(), [...expectedCells].sort());
  assert.equal(actualCells.size, 145);

  const routeCodes = [...actualCells].map((key) => {
    const [x, y] = key.split(',').map(Number);
    return map.originalTileGrid[y!]![x!]!;
  });
  assert.deepEqual({
    corridor: routeCodes.filter((code) => code === 32).length,
    redirects: routeCodes.filter((code) => code >= 52 && code <= 65).length,
    exits: routeCodes.filter((code) => code === 48).length,
    horizontalBridge: routeCodes.filter((code) => code === 80).length,
    verticalBridge: routeCodes.filter((code) => code === 88).length,
  }, { corridor: 93, redirects: 43, exits: 3, horizontalBridge: 1, verticalBridge: 2 });
  assert.ok(routeCodes.every((code) => code !== 16 && code !== 36 && code !== 0),
    'routed cells stay on corridors, turn markers, exits, and routed bridge tiles');

  const preview = createRouteTestScenario().previewWave!;
  const expectedRuntimeRedirects = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 52 && code <= 65 ? [`${x},${y}:${directionsByAction[code - 52]!.join('/')}`] : []
  ))).sort();
  const actualRuntimeRedirects = runtimeWaveRedirects(preview, map.originalTileGrid)
    .map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`).sort();
  assert.deepEqual(actualRuntimeRedirects, expectedRuntimeRedirects);
});

test('Six Grandfathers short GameSession maps all three wave pools to their first APK turns', async () => {
  const scenario = createRouteTestScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 32_035,
  });

  try {
    let view = session.observe();
    const spawnedByPoint = new Map<number, readonly string[]>();
    for (let frame = 0; frame < 20 && spawnedByPoint.size < 3; frame += 1) {
      view = session.advance({ deltaMs: 100 });
      for (const event of view.events) {
        if (event.type === 'enemy-group-spawned') spawnedByPoint.set(event.spawnPointId, event.enemyIds);
      }
    }
    assert.deepEqual([...spawnedByPoint.keys()].sort(), [0, 1, 2], JSON.stringify({
      wave: view.wave,
      enemies: view.enemies,
      events: view.events,
    }));

    const expectedTurns = [
      { spawnPointId: 0, cell: { x: 13, y: 5 }, direction: 'west' as const },
      { spawnPointId: 1, cell: { x: 28, y: 7 }, direction: 'south' as const },
      { spawnPointId: 2, cell: { x: 26, y: 17 }, direction: 'south' as const },
    ];
    const tracked = expectedTurns.map(({ spawnPointId, cell, direction }) => {
      const enemyIds = spawnedByPoint.get(spawnPointId);
      assert.ok(enemyIds?.length, `spawn pool ${spawnPointId} emitted an enemy group`);
      return { id: enemyIds[0]!, spawnPointId, cell, direction };
    });

    const turned = new Set<number>();
    for (let frame = 0; frame < 150 && turned.size < expectedTurns.length; frame += 1) {
      for (const enemy of tracked) {
        if (turned.has(enemy.spawnPointId)) continue;
        const current = view.enemies.find(({ id }) => id === enemy.id);
        if (current?.direction !== enemy.direction) continue;
        assert.ok(Math.abs(current.positionFine.x - Math.trunc((enemy.cell.x + 0.5) * 7_680)) <= 4);
        assert.ok(Math.abs(current.positionFine.y - Math.trunc((enemy.cell.y + 0.5) * 7_680)) <= 4);
        turned.add(enemy.spawnPointId);
      }
      if (turned.size < expectedTurns.length) view = session.advance({ deltaMs: 100 });
    }
    assert.deepEqual([...turned].sort(), [0, 1, 2]);
  } finally {
    session.close();
  }
});
