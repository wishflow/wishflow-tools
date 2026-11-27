import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/nevada-02.json';
import { bombingtonRouteDefinitions, bombingtonSpawnPointIdByActionId } from '../src/content/bombington-routes';
import { createGame, type Direction, type PreviewWaveDefinition, type ScenarioContent } from '../src/game';
import routeGraphData from './fixtures/bombington-route-graph.json';

interface FixtureNode { tile: number; x: number; y: number }
interface FixtureEdge { from: FixtureNode; direction: Direction; to: FixtureNode; steps: number }
interface RouteGraphFixture {
  resource: string;
  dimensions: readonly [number, number];
  summary: {
    spawnCount: number;
    redirectCount: number;
    exitCount: number;
    uniqueDirectedEdgeCount: number;
    completeSpawnToExitPathCount: number;
    intermediateVisitsByRawTile: Record<string, number>;
  };
  spawns: readonly { actionId: number; tile: number; cell: readonly [number, number]; direction: Direction }[];
  exits: readonly (readonly [number, number])[];
  routesPerSpawnToExits: readonly (readonly number[])[];
  edges: readonly FixtureEdge[];
}

const routeGraph = routeGraphData as unknown as RouteGraphFixture;
const FINE_UNITS_PER_CELL = 7_680;
const directionVectors: Readonly<Record<Direction, readonly [number, number]>> = {
  north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0],
};

function nodeKey(node: FixtureNode): string {
  return `${node.tile}@${node.x},${node.y}`;
}

function routeSignature(route: {
  spawn: { cell: { x: number; y: number }; direction: Direction };
  redirects: readonly { cell: { x: number; y: number }; directions: readonly Direction[] }[];
  exit: { x: number; y: number };
}, actionId: number): string {
  return [
    actionId,
    `${route.spawn.cell.x},${route.spawn.cell.y}:${route.spawn.direction}`,
    ...route.redirects.map(({ cell, directions }) => `${cell.x},${cell.y}:${directions.join('/')}`),
    `${route.exit.x},${route.exit.y}`,
  ].join('|');
}

function expectedRoutesFromFixture() {
  const outgoing = new Map<string, FixtureEdge[]>();
  for (const edge of routeGraph.edges) {
    const key = nodeKey(edge.from);
    outgoing.set(key, [...(outgoing.get(key) ?? []), edge]);
  }

  const routes: { actionId: number; route: {
    spawn: { cell: { x: number; y: number }; direction: Direction };
    redirects: { cell: { x: number; y: number }; directions: Direction[] }[];
    exit: { x: number; y: number };
  } }[] = [];
  for (const spawn of routeGraph.spawns) {
    const start: FixtureNode = { tile: spawn.tile, x: spawn.cell[0], y: spawn.cell[1] };
    const walk = (
      current: FixtureNode,
      redirects: { cell: { x: number; y: number }; directions: Direction[] }[],
      visited: ReadonlySet<string>,
    ): void => {
      const edges = outgoing.get(nodeKey(current)) ?? [];
      assert.ok(edges.length > 0, `route node ${nodeKey(current)} has an outgoing edge`);
      for (const edge of edges) {
        const nextRedirects = current.tile >= 52 && current.tile <= 65
          ? [...redirects, { cell: { x: current.x, y: current.y }, directions: [edge.direction] }]
          : redirects;
        if (edge.to.tile === 48) {
          routes.push({
            actionId: spawn.actionId,
            route: {
              spawn: { cell: { x: start.x, y: start.y }, direction: spawn.direction },
              redirects: nextRedirects,
              exit: { x: edge.to.x, y: edge.to.y },
            },
          });
          continue;
        }
        const key = nodeKey(edge.to);
        assert.ok(!visited.has(key), `fixture route has no cycle at ${key}`);
        walk(edge.to, nextRedirects, new Set(visited).add(key));
      }
    };
    walk(start, [], new Set([nodeKey(start)]));
  }
  return routes;
}

function createRouteScenario(): ScenarioContent {
  const spawns = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 40 && code <= 46
      ? [{ cell: { x, y }, direction: (x === 31 ? 'west' : x === 0 ? 'east' : y === 23 ? 'north' : 'south') as Direction }]
      : []
  )));
  const exits = routeGraph.exits.map(([x, y]) => ({ x, y }));
  const firstRoute = bombingtonRouteDefinitions[0]!;
  const previewWave: PreviewWaveDefinition = {
    number: 1,
    initialLives: 25,
    initialCash: 250,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 100, medium: 100, hard: 100 },
    spawn: spawns[0]!,
    additionalSpawns: spawns.slice(1),
    routes: bombingtonRouteDefinitions,
    enemy: {
      hitPoints: 1,
      cashReward: 0,
      penetration: { light: 0, fire: 0, heavy: 0, poison: 0 },
    },
    baseEnemySpeed: 500,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: firstRoute.redirects,
    exit: firstRoute.exit,
    additionalExits: exits.filter(({ x, y }) => x !== firstRoute.exit.x || y !== firstRoute.exit.y),
  };
  return {
    id: 'bombington-route-test',
    formalSettlementSupported: true,
    title: { en: 'Bombington route test', zh: '炸弹镇路线测试' },
    map: { ...map.map, originalTileGrid: map.originalTileGrid },
    originalTileGrid: map.originalTileGrid,
    units: [],
    previewWave,
  };
}

test('Bombington route graph matches every APK spawn, exit, turn, branch, and complete path', () => {
  assert.equal(map.source.resource, routeGraph.resource);
  assert.deepEqual([map.map.width, map.map.height], routeGraph.dimensions);

  const gridNodes = map.originalTileGrid.flatMap((row, y) => row.flatMap((tile, x) => {
    if (tile >= 40 && tile <= 46) return [[tile, x, y]];
    if (tile >= 52 && tile <= 65) return [[tile, x, y]];
    if (tile === 48) return [[tile, x, y]];
    return [];
  }));
  assert.equal(gridNodes.filter(([tile]) => tile >= 40 && tile <= 46).length, routeGraph.summary.spawnCount);
  assert.equal(gridNodes.filter(([tile]) => tile >= 52 && tile <= 65).length, routeGraph.summary.redirectCount);
  assert.equal(gridNodes.filter(([tile]) => tile === 48).length, routeGraph.summary.exitCount);

  const rowMajorActions = map.originalTileGrid.flatMap((row) => row
    .filter((tile) => tile >= 40 && tile <= 46)
    .map((tile) => tile - 40));
  assert.deepEqual(bombingtonSpawnPointIdByActionId, Object.fromEntries(
    rowMajorActions.map((actionId, spawnPointId) => [actionId, spawnPointId]),
  ));

  const expected = expectedRoutesFromFixture();
  assert.equal(expected.length, routeGraph.summary.completeSpawnToExitPathCount);
  assert.equal(bombingtonRouteDefinitions.length, expected.length);
  assert.deepEqual(
    bombingtonRouteDefinitions.map((route) => routeSignature(
      route,
      map.originalTileGrid[route.spawn.cell.y]![route.spawn.cell.x]! - 40,
    )).sort(),
    expected.map(({ actionId, route }) => routeSignature(route, actionId)).sort(),
  );

  const actualMatrix = routeGraph.spawns.map(({ actionId, cell }) => {
    const pointId = bombingtonSpawnPointIdByActionId[actionId];
    assert.notEqual(pointId, undefined);
    return [actionId, ...routeGraph.exits.map(([x, y]) => bombingtonRouteDefinitions.filter((route) => (
      route.spawn.cell.x === cell[0] && route.spawn.cell.y === cell[1]
      && route.exit.x === x && route.exit.y === y
    )).length)];
  });
  assert.deepEqual(actualMatrix, routeGraph.routesPerSpawnToExits);

  const actualEdges = new Set<string>();
  for (const route of bombingtonRouteDefinitions) {
    const controlCells = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    assert.equal(new Set(controlCells.map(({ x, y }) => `${x},${y}`)).size, controlCells.length, 'route has no repeated control cell');
    let from = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const redirect of route.redirects) {
      const fromTile = map.originalTileGrid[from.y]![from.x]!;
      const toTile = map.originalTileGrid[redirect.cell.y]![redirect.cell.x]!;
      actualEdges.add(`${fromTile}@${from.x},${from.y}:${direction}->${toTile}@${redirect.cell.x},${redirect.cell.y}`);
      from = redirect.cell;
      assert.equal(redirect.directions.length, 1, 'each expanded route selects one direction at each marker');
      direction = redirect.directions[0]!;
    }
    const exitTile = map.originalTileGrid[route.exit.y]![route.exit.x]!;
    actualEdges.add(`${map.originalTileGrid[from.y]![from.x]!}@${from.x},${from.y}:${direction}->${exitTile}@${route.exit.x},${route.exit.y}`);
  }
  const expectedEdges = routeGraph.edges.map(({ from, direction, to }) => (
    `${from.tile}@${from.x},${from.y}:${direction}->${to.tile}@${to.x},${to.y}`
  ));
  assert.equal(actualEdges.size, routeGraph.summary.uniqueDirectedEdgeCount);
  assert.deepEqual([...actualEdges].sort(), expectedEdges.sort());

  const directionVector = (direction: Direction) => directionVectors[direction];
  for (const edge of routeGraph.edges) {
    const [dx, dy] = directionVector(edge.direction);
    assert.equal(Math.abs(edge.to.x - edge.from.x) + Math.abs(edge.to.y - edge.from.y), edge.steps);
    for (let step = 1; step <= edge.steps; step += 1) {
      const x = edge.from.x + dx * step;
      const y = edge.from.y + dy * step;
      assert.ok(x >= 0 && y >= 0 && x < map.map.width && y < map.map.height, 'route segment remains inside map bounds');
    }
  }
});

test('Bombington preview session maps every APK spawn action to its row-major start direction', async () => {
  const scenario = createRouteScenario();
  const game = createGame({ scenarios: { [scenario.id]: scenario } });
  const session = await game.open({ scenarioId: scenario.id, mode: 'free', difficulty: 'medium', randomSeed: 42 });
  try {
    assert.equal(session.submitIntent({ type: 'start-wave' }), true);
    session.advance({ deltaMs: 100 });
    const view = session.advance({ deltaMs: 100 });
    for (const [spawnPointId, spawn] of [scenario.previewWave!.spawn, ...scenario.previewWave!.additionalSpawns!].entries()) {
      const enemy = view.enemies.find(({ id }) => id === `preview-pioneer-${spawnPointId + 1}`);
      assert.ok(enemy, `spawn point ${spawnPointId} created its preview enemy`);
      assert.equal(enemy.direction, spawn.direction, `spawn point ${spawnPointId} moves along its APK edge direction`);
      const [dx, dy] = directionVectors[spawn.direction];
      const startX = spawn.cell.x * FINE_UNITS_PER_CELL + FINE_UNITS_PER_CELL / 2 - dx * 2 * FINE_UNITS_PER_CELL;
      const startY = spawn.cell.y * FINE_UNITS_PER_CELL + FINE_UNITS_PER_CELL / 2 - dy * 2 * FINE_UNITS_PER_CELL;
      assert.equal(Math.sign(enemy.positionFine.x - startX), dx, `spawn point ${spawnPointId} advances on APK x-axis`);
      assert.equal(Math.sign(enemy.positionFine.y - startY), dy, `spawn point ${spawnPointId} advances on APK y-axis`);
    }
  } finally {
    session.close();
  }
});
