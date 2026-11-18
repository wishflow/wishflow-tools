import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/dakota-03.json';
import { dakota03RouteDefinitions, dakota03SpawnPointIdByActionId } from '../src/content/dakota-03-routes';
import { createGame, type Direction, type PreviewWaveDefinition, type ScenarioContent } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import { deriveOriginalBackgroundCodesForTest } from './helpers/terrain-render-reference';

const FINE_UNITS_PER_CELL = 7_680;
const expectedRoutes: readonly {
  actionId: number;
  spawn: { cell: { x: number; y: number }; direction: Direction };
  redirects: readonly { cell: { x: number; y: number }; direction: Direction }[];
  exit: { x: number; y: number };
  firstTurn: { x: number; y: number };
}[] = [
  {
    actionId: 0,
    spawn: { cell: { x: 5, y: 23 }, direction: 'north' },
    redirects: [
      { cell: { x: 5, y: 18 }, direction: 'east' }, { cell: { x: 7, y: 18 }, direction: 'north' },
      { cell: { x: 7, y: 13 }, direction: 'west' }, { cell: { x: 2, y: 13 }, direction: 'north' },
      { cell: { x: 2, y: 7 }, direction: 'east' }, { cell: { x: 5, y: 7 }, direction: 'north' },
      { cell: { x: 5, y: 4 }, direction: 'east' }, { cell: { x: 8, y: 4 }, direction: 'north' },
    ],
    exit: { x: 8, y: 0 },
    firstTurn: { x: 5, y: 18 },
  },
  {
    actionId: 1,
    spawn: { cell: { x: 14, y: 23 }, direction: 'north' },
    redirects: [
      { cell: { x: 14, y: 19 }, direction: 'east' }, { cell: { x: 15, y: 19 }, direction: 'north' },
      { cell: { x: 15, y: 18 }, direction: 'east' }, { cell: { x: 16, y: 18 }, direction: 'north' },
      { cell: { x: 16, y: 12 }, direction: 'west' }, { cell: { x: 15, y: 12 }, direction: 'north' },
      { cell: { x: 15, y: 10 }, direction: 'west' }, { cell: { x: 14, y: 10 }, direction: 'north' },
      { cell: { x: 14, y: 8 }, direction: 'west' }, { cell: { x: 13, y: 8 }, direction: 'north' },
      { cell: { x: 13, y: 4 }, direction: 'east' }, { cell: { x: 14, y: 4 }, direction: 'north' },
      { cell: { x: 14, y: 3 }, direction: 'east' }, { cell: { x: 15, y: 3 }, direction: 'north' },
    ],
    exit: { x: 15, y: 0 },
    firstTurn: { x: 14, y: 19 },
  },
  {
    actionId: 2,
    spawn: { cell: { x: 15, y: 23 }, direction: 'north' },
    redirects: [
      { cell: { x: 15, y: 20 }, direction: 'east' }, { cell: { x: 16, y: 20 }, direction: 'north' },
      { cell: { x: 16, y: 19 }, direction: 'east' }, { cell: { x: 17, y: 19 }, direction: 'north' },
      { cell: { x: 17, y: 11 }, direction: 'west' }, { cell: { x: 16, y: 11 }, direction: 'north' },
      { cell: { x: 16, y: 9 }, direction: 'west' }, { cell: { x: 15, y: 9 }, direction: 'north' },
      { cell: { x: 15, y: 7 }, direction: 'west' }, { cell: { x: 14, y: 7 }, direction: 'north' },
      { cell: { x: 14, y: 5 }, direction: 'east' }, { cell: { x: 15, y: 5 }, direction: 'north' },
      { cell: { x: 15, y: 4 }, direction: 'east' }, { cell: { x: 16, y: 4 }, direction: 'north' },
    ],
    exit: { x: 16, y: 0 },
    firstTurn: { x: 15, y: 20 },
  },
  {
    actionId: 3,
    spawn: { cell: { x: 26, y: 23 }, direction: 'north' },
    redirects: [
      { cell: { x: 26, y: 19 }, direction: 'east' }, { cell: { x: 28, y: 19 }, direction: 'north' },
      { cell: { x: 28, y: 15 }, direction: 'west' }, { cell: { x: 26, y: 15 }, direction: 'north' },
      { cell: { x: 26, y: 14 }, direction: 'west' }, { cell: { x: 22, y: 14 }, direction: 'north' },
      { cell: { x: 22, y: 9 }, direction: 'east' }, { cell: { x: 27, y: 9 }, direction: 'north' },
      { cell: { x: 27, y: 3 }, direction: 'west' }, { cell: { x: 24, y: 3 }, direction: 'north' },
    ],
    exit: { x: 24, y: 0 },
    firstTurn: { x: 26, y: 19 },
  },
];

function vector(direction: Direction): readonly [number, number] {
  if (direction === 'north') return [0, -1];
  if (direction === 'south') return [0, 1];
  if (direction === 'west') return [-1, 0];
  return [1, 0];
}

function expandedEdges(route: {
  spawn: { cell: { x: number; y: number }; direction: Direction };
  redirects: readonly { cell: { x: number; y: number }; directions: readonly Direction[] }[];
  exit: { x: number; y: number };
}): number[][] {
  let from = route.spawn.cell;
  let direction = route.spawn.direction;
  const edges: number[][] = [];
  for (const target of [...route.redirects.map(({ cell, directions }) => ({ cell, direction: directions[0]! })), {
    cell: route.exit,
    direction,
  }]) {
    const dx = target.cell.x - from.x;
    const dy = target.cell.y - from.y;
    const steps = Math.abs(dx) + Math.abs(dy);
    const [stepX, stepY] = vector(direction);
    edges.push([from.x, from.y, stepX, stepY, target.cell.x, target.cell.y, steps]);
    from = target.cell;
    direction = target.direction;
  }
  return edges;
}

function addEdgeCells(cells: Set<string>, edge: readonly number[]): void {
  const [x, y, dx, dy, , , steps] = edge;
  for (let step = 0; step <= steps!; step += 1) cells.add(`${x! + (dx! * step)},${y! + (dy! * step)}`);
}

function sortedJson(values: readonly unknown[]): string[] {
  return values.map((value) => JSON.stringify(value)).sort();
}

function expectedEdgeSet(): number[][] {
  return expectedRoutes.flatMap(({ spawn, redirects, exit }) => expandedEdges({
    spawn,
    redirects: redirects.map(({ cell, direction }) => ({ cell, directions: [direction] })),
    exit,
  }));
}

function createRouteScenario(): ScenarioContent {
  const routes = dakota03RouteDefinitions;
  const first = routes[0]!;
  const previewWave: PreviewWaveDefinition = {
    number: 1,
    initialLives: 25,
    enemyHitPointMultiplierPercentByDifficulty: { easy: 100, medium: 100, hard: 100 },
    enemy: { hitPoints: 1, cashReward: 0, penetration: { light: 0, fire: 0, heavy: 0, poison: 0 } },
    spawn: first.spawn,
    additionalSpawns: routes.slice(1).map(({ spawn }) => spawn),
    routes,
    baseEnemySpeed: 500,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: first.redirects,
    exit: first.exit,
    additionalExits: [...new Map(routes.map(({ exit }) => [`${exit.x},${exit.y}`, exit])).values()].slice(1),
  };

  return {
    id: 'fort-knockout-route-test',
    formalSettlementSupported: true,
    title: { en: 'Fort Knockout route test', zh: 'Fort Knockout 路线测试' },
    map: {
      ...map.map,
      originalTileGrid: map.originalTileGrid,
      backgroundCollisionCodes: deriveOriginalBackgroundCodesForTest(map),
    },
    originalTileGrid: map.originalTileGrid,
    units: [],
    previewWave,
  };
}

test('Fort Knockout route data matches all APK paths, directed edges, and road cells', () => {
  assert.equal(dakota03RouteDefinitions.length, 4);
  assert.deepEqual(dakota03SpawnPointIdByActionId, { 0: 0, 1: 1, 2: 2, 3: 3 });

  const actualRoutes = dakota03RouteDefinitions.map(({ spawn, redirects, exit }) => ({
    spawn,
    redirects: redirects.map(({ cell, directions }) => ({ cell, direction: directions[0] })),
    exit,
  }));
  const expected = expectedRoutes.map(({ actionId: _actionId, firstTurn: _firstTurn, ...route }) => route);
  assert.deepEqual(actualRoutes, expected);

  const actualSegments = dakota03RouteDefinitions.flatMap(expandedEdges);
  assert.equal(actualSegments.length, 50);
  assert.deepEqual(sortedJson(actualSegments), sortedJson(expectedEdgeSet()));
  const actualEdges = actualSegments.flatMap(([x, y, dx, dy, , , steps]) => Array.from(
    { length: steps! },
    (_, step) => [x! + (dx! * step), y! + (dy! * step), dx!, dy!, x! + (dx! * (step + 1)), y! + (dy! * (step + 1))],
  ));
  assert.equal(actualEdges.length, 135);
  assert.equal(new Set(sortedJson(actualEdges)).size, 135);

  const routeCells = new Set<string>();
  for (const segment of actualSegments) addEdgeCells(routeCells, segment);
  assert.equal(routeCells.size, 139);
  const routeCodes = [...routeCells].map((cell) => {
    const [x, y] = cell.split(',').map(Number);
    return map.originalTileGrid[y!]![x!]!;
  });
  assert.deepEqual({
    corridors: routeCodes.filter((code) => code === 32).length,
    spawns: routeCodes.filter((code) => code >= 40 && code <= 43).length,
    exits: routeCodes.filter((code) => code === 48).length,
    redirects: routeCodes.filter((code) => code === 52 || code === 54 || code === 55).length,
    bridges: routeCodes.filter((code) => code === 80).length,
  }, { corridors: 78, spawns: 4, exits: 4, redirects: 46, bridges: 7 });
  assert.ok(routeCodes.every((code) => [32, 40, 41, 42, 43, 48, 52, 54, 55, 80].includes(code)),
    'enemy routes stay on TDM route markers and bridge overlays, away from cliffs, water, and rail');
});

test('Fort Knockout runtime redirect projection matches every TDM turn marker', () => {
  const actual = runtimeWaveRedirects(createRouteScenario().previewWave!, map.originalTileGrid)
    .map(({ cell, directions }) => [cell.x, cell.y, ...directions])
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const expected = expectedRoutes.flatMap(({ redirects }) => redirects.map(({ cell, direction }) => [
    cell.x, cell.y, direction,
  ])).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  assert.deepEqual(actual, expected);
});

test('Fort Knockout short GameSession moves all four enemy entries through their first turn', async () => {
  const scenario = createRouteScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 33_036,
  });

  try {
    assert.equal(session.submitIntent({ type: 'start-wave' }), true);
    let view = session.advance({ deltaMs: 100 });
    const turned = new Set<number>();
    for (let frame = 0; frame < 120 && turned.size < expectedRoutes.length; frame += 1) {
      for (const [index, expected] of expectedRoutes.entries()) {
        if (turned.has(index)) continue;
        const enemy = view.enemies.find(({ id }) => id === `preview-pioneer-${index + 1}`);
        if (enemy?.direction !== expected.redirects[0]?.direction) continue;
        const targetX = (expected.firstTurn.x + 0.5) * FINE_UNITS_PER_CELL;
        const targetY = (expected.firstTurn.y + 0.5) * FINE_UNITS_PER_CELL;
        assert.ok(Math.abs(enemy.positionFine.x - targetX) <= FINE_UNITS_PER_CELL);
        assert.ok(Math.abs(enemy.positionFine.y - targetY) <= FINE_UNITS_PER_CELL);
        turned.add(index);
      }
      if (turned.size < expectedRoutes.length) view = session.advance({ deltaMs: 100 });
    }
    assert.deepEqual([...turned].sort(), [0, 1, 2, 3], JSON.stringify({ wave: view.wave, enemies: view.enemies }));
  } finally {
    session.close();
  }
});
