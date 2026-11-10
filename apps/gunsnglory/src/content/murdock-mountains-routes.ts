import type { Direction, WaveRedirect, WaveRouteDefinition } from '../game';

type RouteStep = readonly [x: number, y: number, direction: Direction];

function route(
  spawn: RouteStep,
  redirects: readonly RouteStep[],
  exit: { x: number; y: number },
): WaveRouteDefinition {
  return {
    spawn: { cell: { x: spawn[0], y: spawn[1] }, direction: spawn[2] },
    redirects: redirects.map(([x, y, direction]) => ({ cell: { x, y }, directions: [direction] })),
    exit: { ...exit },
  };
}

/** Two deterministic direction-field routes in the APK enemy-pool scan order. */
export const murdockMountainsRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route([16, 4, 'west'], [
    [11, 4, 'south'], [11, 6, 'west'], [8, 6, 'south'], [8, 13, 'east'],
    [11, 13, 'south'], [11, 20, 'west'], [9, 20, 'south'],
  ], { x: 9, y: 23 }),
  route([0, 5, 'east'], [
    [4, 5, 'south'], [4, 6, 'east'], [7, 6, 'south'], [7, 14, 'east'],
    [10, 14, 'south'], [10, 18, 'west'], [9, 18, 'south'], [9, 19, 'west'], [8, 19, 'south'],
  ], { x: 8, y: 23 }),
]);

export const murdockMountainsSpawnPoints = Object.freeze(
  murdockMountainsRouteDefinitions.map(({ spawn }) => Object.freeze({
    cell: Object.freeze({ ...spawn.cell }),
    direction: spawn.direction,
  })),
);

export const murdockMountainsExits = Object.freeze(
  murdockMountainsRouteDefinitions.map(({ exit }) => Object.freeze({ ...exit })),
);

const redirectsByCell = new Map<string, { cell: { x: number; y: number }; directions: Set<Direction> }>();
for (const routeDefinition of murdockMountainsRouteDefinitions) {
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

/** Unique direction-field cells consumed by enemy movement and minimap route drawing. */
export const murdockMountainsRedirects: readonly WaveRedirect[] = Object.freeze(
  [...redirectsByCell.values()].map(({ cell, directions }) => Object.freeze({
    cell: Object.freeze(cell),
    directions: Object.freeze([...directions]),
  })),
);
