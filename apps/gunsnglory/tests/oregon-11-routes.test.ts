import assert from 'node:assert/strict';
import test from 'node:test';
import { createOregon09CampaignContent } from '../src/content/oregon-09-campaign';
import map from '../src/content/oregon-11.json';
import { createOregon11MapScene } from '../src/content/oregon-11-scene';
import { oregon11RouteDefinitions, oregon11SpawnPointIdByActionId } from '../src/content/oregon-11-routes';
import { createGame, type Direction, type PreviewWaveDefinition, type ScenarioContent } from '../src/game';
import { runtimeWaveRedirects } from '../src/game/wave-routes';
import routeGraph from './fixtures/oregon-11-route-graph.json';

const directionByAction: readonly (readonly Direction[])[] = [
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
  return [...new Map(oregon11RouteDefinitions.map(({ spawn }) => [
    `${cellKey(spawn.cell)}:${spawn.direction}`, spawn,
  ])).values()];
}

function uniqueExits() {
  return [...new Map(oregon11RouteDefinitions.map(({ exit }) => [cellKey(exit), exit])).values()];
}

function previewWave(): PreviewWaveDefinition {
  const routes = oregon11RouteDefinitions;
  const firstRoute = routes[0]!;
  const spawns = uniqueSpawns();
  const exits = uniqueExits();
  return {
    number: 1,
    initialLives: 25,
    initialCash: 250,
    spawn: spawns[0]!,
    additionalSpawns: spawns.slice(1),
    routes,
    baseEnemySpeed: 1_200,
    speedMultiplierMin: 100,
    speedMultiplierCount: 1,
    escapePenalty: 1,
    redirects: firstRoute.redirects,
    exit: firstRoute.exit,
    additionalExits: exits.slice(1),
  };
}

function createRouteTestScenario(): ScenarioContent {
  const base = createOregon09CampaignContent([]);
  const wave = {
    number: 1,
    delayMs: 0,
    hitPointMultiplierPercent: 100,
    speedMultiplierPercent: 100,
    spawnPools: uniqueSpawns().map((_, spawnPointId) => ({
      spawnPointId,
      intervalMs: 0,
      requests: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    })),
  };
  return {
    ...base,
    id: 'loot-lakes-route-test',
    units: [],
    map: createOregon11MapScene(),
    originalTileGrid: map.originalTileGrid,
    previewWave: previewWave(),
    campaignWaveCount: 1,
    campaignWaves: [wave],
    campaignUnitPool: undefined,
  };
}

function sortedRedirects(redirects: readonly { cell: { x: number; y: number }; directions: readonly Direction[] }[]) {
  return redirects.map(({ cell, directions }) => `${cellKey(cell)}:${directions.join('/')}`).sort();
}

test('Loot Lakes routes reproduce every audited marker, edge, and runtime action direction', () => {
  assert.deepEqual(routeGraph.dimensions, [map.map.width, map.map.height]);
  const expectedActionMap = Object.fromEntries(routeGraph.spawns.map(({ actionId, spawnPointId }) => [
    actionId, spawnPointId,
  ]));
  assert.deepEqual(expectedActionMap, { 0: 2, 1: 1, 2: 0 });
  assert.deepEqual(oregon11SpawnPointIdByActionId, expectedActionMap);
  assert.deepEqual(uniqueSpawns().map(({ cell, direction }) => [
    [cell.x, cell.y], vectorForDirection(direction),
  ]), [...routeGraph.spawns].sort((left, right) => left.spawnPointId - right.spawnPointId)
    .map(({ cell, direction }) => [cell, direction]));

  const actualEdges = new Set<string>();
  for (const route of oregon11RouteDefinitions) {
    let current = route.spawn.cell;
    let direction = route.spawn.direction;
    for (const redirect of route.redirects) {
      actualEdges.add(`${cellKey(current)}:${direction}->${cellKey(redirect.cell)}`);
      current = redirect.cell;
      direction = redirect.directions[0]!;
    }
    actualEdges.add(`${cellKey(current)}:${direction}->${cellKey(route.exit)}`);
  }
  assert.equal(routeGraph.summary.spawnCount, uniqueSpawns().length);
  assert.equal(routeGraph.summary.redirectCount, map.originalTileGrid.flat().filter((code) => code >= 52 && code <= 65).length);
  assert.equal(routeGraph.summary.exitCount, map.originalTileGrid.flat().filter((code) => code === 48).length);
  assert.equal(routeGraph.edges.length, routeGraph.summary.edgeCount);
  assert.deepEqual([...actualEdges].sort(), [...routeGraph.edges].sort());
  for (const spawn of routeGraph.spawns) {
    const [x, y] = spawn.cell;
    const direction = spawn.direction[0] < 0 ? 'west' : spawn.direction[0] > 0 ? 'east'
      : spawn.direction[1] < 0 ? 'north' : 'south';
    assert.ok(actualEdges.has(`${x},${y}:${direction}->${spawn.firstControlCell.join(',')}`));
  }

  const routeRedirects = oregon11RouteDefinitions.flatMap(({ redirects }) => redirects);
  const reachedRedirects = new Set(routeRedirects.map(({ cell }) => cellKey(cell)));
  assert.equal(reachedRedirects.size, routeGraph.summary.redirectCount, 'every TDM turn is reached by a complete route');
  assert.deepEqual([...uniqueExits()].map(cellKey).sort(), ['0,1', '0,2', '0,9']);

  const preview = previewWave();
  const expectedRuntimeRedirects = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code >= 52 && code <= 65 ? [`${cellKey({ x, y })}:${directionByAction[code - 52]!.join('/')}`] : []
  ))).sort();
  assert.deepEqual(sortedRedirects(runtimeWaveRedirects(preview, map.originalTileGrid)), expectedRuntimeRedirects);
});

test('Loot Lakes short GameSession maps all three wave actions to the right entrance and first turn', async () => {
  const scenario = createRouteTestScenario();
  const session = await createGame({ scenarios: { [scenario.id]: scenario } }).open({
    scenarioId: scenario.id,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 31_034,
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
    assert.deepEqual([...spawnedByPoint.keys()].sort(), [0, 1, 2]);

    const expectedTurns = [
      { spawnPointId: 0, cell: { x: 25, y: 3 }, direction: 'south' as const },
      { spawnPointId: 1, cell: { x: 28, y: 21 }, direction: 'north' as const },
      { spawnPointId: 2, cell: { x: 13, y: 20 }, direction: 'east' as const },
    ];
    const tracked = expectedTurns.flatMap(({ spawnPointId, cell, direction }) => {
      const ids = spawnedByPoint.get(spawnPointId);
      assert.ok(ids?.length, `spawn action ${spawnPointId} emitted an enemy group`);
      return [{ id: ids[0]!, spawnPointId, cell, direction }];
    });

    const turned = new Set<number>();
    for (let frame = 0; frame < 300 && turned.size < expectedTurns.length; frame += 1) {
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
