import type { Direction, WaveRedirect, WaveRouteDefinition, WaveSpawn } from '../game';

type RouteControl = readonly [x: number, y: number, direction: Direction];

const luckyLakeSpawnPoints: readonly WaveSpawn[] = Object.freeze([
  Object.freeze({ cell: Object.freeze({ x: 31, y: 4 }), direction: 'west' as const }),
  Object.freeze({ cell: Object.freeze({ x: 31, y: 13 }), direction: 'west' as const }),
  Object.freeze({ cell: Object.freeze({ x: 31, y: 14 }), direction: 'west' as const }),
]);

function route(
  spawnIndex: number,
  controls: readonly RouteControl[],
  exit: { x: number; y: number },
): WaveRouteDefinition {
  return {
    spawn: luckyLakeSpawnPoints[spawnIndex]!,
    redirects: controls.map(([x, y, direction]) => ({ cell: { x, y }, directions: [direction] })),
    exit,
  };
}

/** Five legal APK direction-field paths in original spawn scan order and branch outcomes. */
export const luckyLakeRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route(0, [
    [26, 4, 'south'], [26, 8, 'west'], [22, 8, 'north'], [22, 4, 'west'], [16, 4, 'north'],
    [16, 1, 'west'], [10, 1, 'south'], [10, 4, 'west'], [6, 4, 'south'], [6, 5, 'west'],
    [2, 5, 'south'], [2, 10, 'east'], [5, 10, 'south'], [5, 14, 'west'],
  ], { x: 0, y: 14 }),
  route(1, [
    [23, 13, 'north'], [23, 9, 'west'], [21, 9, 'north'], [21, 5, 'west'], [15, 5, 'north'],
    [15, 2, 'west'], [11, 2, 'south'], [11, 5, 'west'], [6, 5, 'west'], [2, 5, 'south'],
    [2, 10, 'east'], [5, 10, 'south'], [5, 14, 'west'],
  ], { x: 0, y: 14 }),
  route(1, [
    [23, 13, 'south'], [23, 20, 'west'], [15, 20, 'north'], [15, 18, 'west'], [5, 18, 'north'],
    [5, 14, 'west'],
  ], { x: 0, y: 14 }),
  route(1, [
    [23, 13, 'south'], [23, 20, 'west'], [15, 20, 'north'], [15, 18, 'west'], [5, 18, 'south'],
    [5, 19, 'west'], [2, 19, 'south'],
  ], { x: 2, y: 23 }),
  route(2, [
    [27, 14, 'south'], [27, 18, 'west'], [24, 18, 'south'], [24, 21, 'west'],
    [14, 21, 'north'], [14, 19, 'west'], [5, 19, 'west'], [2, 19, 'south'],
  ], { x: 2, y: 23 }),
]);

export const luckyLakeExits = Object.freeze([{ x: 0, y: 14 }, { x: 2, y: 23 }]);

const redirectsByCell = new Map<string, { cell: { x: number; y: number }; directions: Set<Direction> }>();
for (const routeDefinition of luckyLakeRouteDefinitions) {
  for (const redirect of routeDefinition.redirects) {
    const key = `${redirect.cell.x},${redirect.cell.y}`;
    const existing = redirectsByCell.get(key);
    if (existing) {
      for (const direction of redirect.directions) existing.directions.add(direction);
    } else {
      redirectsByCell.set(key, { cell: { ...redirect.cell }, directions: new Set(redirect.directions) });
    }
  }
}

/** Unique direction-field cells for map overlays, preserving APK grid order. */
export const luckyLakeRedirects: readonly WaveRedirect[] = Object.freeze(
  [...redirectsByCell.values()]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x)
    .map(({ cell, directions }) => Object.freeze({
      cell: Object.freeze(cell),
      directions: Object.freeze([...directions]),
    })),
);

export { luckyLakeSpawnPoints };
