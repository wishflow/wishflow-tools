import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/nevada-01.json';
import routeGraph from './fixtures/labyrinth-gulch-route-graph.json';
import {
  nevada01RouteDefinitions,
  nevada01SpawnPointIdByActionId,
} from '../src/content/nevada-01-routes';

const directionVector = Object.freeze({
  north: [0, -1],
  south: [0, 1],
  west: [-1, 0],
  east: [1, 0],
} as const);

function edgeKey(from: { x: number; y: number }, direction: readonly number[], to: { x: number; y: number }): string {
  return `${from.x},${from.y}:${direction[0]},${direction[1]}:${to.x},${to.y}`;
}

test('Labyrinth Gulch route parser matches every original spawn, branch and exit edge', () => {
  assert.equal(routeGraph.campaignLevel, 41);
  assert.equal(routeGraph.mapIndex, 44);
  assert.deepEqual(routeGraph.summary, {
    spawn_count: 4,
    redirector_count: 47,
    exit_count: 2,
    reachable_redirector_count: 47,
    unreachable_redirectors: [],
    reachable_exit_count: 2,
    unreachable_exits: [],
    exceptional_path_count: 0,
    exceptional_paths: [],
  });
  assert.deepEqual(nevada01SpawnPointIdByActionId, { 2: 0, 0: 1, 1: 2, 3: 3 });

  const expectedEdges = new Set(routeGraph.edges.map(({ from, direction, to }) => edgeKey(from, direction, to)));
  const actualEdges = new Set<string>();
  const exitCells = new Set<string>();

  for (const route of nevada01RouteDefinitions) {
    const nodes = [route.spawn.cell, ...route.redirects.map(({ cell }) => cell), route.exit];
    const directions = [route.spawn.direction, ...route.redirects.map(({ directions: choices }) => {
      assert.equal(choices.length, 1, 'each enumerated route chooses one APK direction at each junction');
      return choices[0]!;
    })];
    assert.equal(directions.length, nodes.length - 1);

    for (let index = 0; index < directions.length; index += 1) {
      const direction = directions[index]!;
      const vector = directionVector[direction];
      const from = nodes[index]!;
      const to = nodes[index + 1]!;
      actualEdges.add(edgeKey(from, vector, to));

      let x = from.x;
      let y = from.y;
      while (x !== to.x || y !== to.y) {
        x += vector[0];
        y += vector[1];
        if (x === to.x && y === to.y) break;
        const code = map.originalTileGrid[y]?.[x];
        assert.ok(code === 32 || code === 80 || code === 88,
          `route segment ${from.x},${from.y} to ${to.x},${to.y} stays on road or bridge at ${x},${y}; got ${code}`);
      }
    }

    exitCells.add(`${route.exit.x},${route.exit.y}`);
  }

  assert.deepEqual(actualEdges, expectedEdges);
  assert.deepEqual([...exitCells].sort(), routeGraph.exits.map(({ x, y }) => `${x},${y}`).sort());
  assert.ok(nevada01RouteDefinitions.length > routeGraph.summary.spawn_count,
    'the map retains multiple route branches rather than one straight route per spawn');
});
