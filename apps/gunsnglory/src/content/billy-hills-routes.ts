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

/** Five concrete route variants obtained from the two original random direction fields. */
export const billyHillsRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route([0, 5, 'east'], [
    [7, 5, 'north'], [7, 3, 'east'], [10, 3, 'south'], [10, 4, 'east'], [14, 4, 'south'],
    [14, 6, 'east'], [17, 6, 'south'], [17, 10, 'west'], [13, 10, 'south'], [13, 15, 'east'],
    [17, 15, 'south'], [17, 19, 'east'], [26, 19, 'north'], [26, 15, 'west'], [25, 15, 'north'],
    [25, 8, 'east'], [26, 8, 'north'], [26, 7, 'east'],
  ], { x: 31, y: 7 }),
  route([0, 5, 'east'], [
    [7, 5, 'north'], [7, 3, 'east'], [10, 3, 'south'], [10, 4, 'east'], [14, 4, 'south'],
    [14, 6, 'east'], [17, 6, 'south'], [17, 10, 'east'], [21, 10, 'south'], [21, 15, 'west'],
    [17, 15, 'south'], [17, 19, 'east'], [26, 19, 'north'], [26, 15, 'west'], [25, 15, 'north'],
    [25, 8, 'east'], [26, 8, 'north'], [26, 7, 'east'],
  ], { x: 31, y: 7 }),
  route([0, 5, 'east'], [
    [7, 5, 'south'], [7, 6, 'east'], [10, 6, 'north'], [10, 4, 'east'], [14, 4, 'south'],
    [14, 6, 'east'], [17, 6, 'south'], [17, 10, 'west'], [13, 10, 'south'], [13, 15, 'east'],
    [17, 15, 'south'], [17, 19, 'east'], [26, 19, 'north'], [26, 15, 'west'], [25, 15, 'north'],
    [25, 8, 'east'], [26, 8, 'north'], [26, 7, 'east'],
  ], { x: 31, y: 7 }),
  route([0, 5, 'east'], [
    [7, 5, 'south'], [7, 6, 'east'], [10, 6, 'north'], [10, 4, 'east'], [14, 4, 'south'],
    [14, 6, 'east'], [17, 6, 'south'], [17, 10, 'east'], [21, 10, 'south'], [21, 15, 'west'],
    [17, 15, 'south'], [17, 19, 'east'], [26, 19, 'north'], [26, 15, 'west'], [25, 15, 'north'],
    [25, 8, 'east'], [26, 8, 'north'], [26, 7, 'east'],
  ], { x: 31, y: 7 }),
  route([0, 13, 'east'], [
    [5, 13, 'south'], [5, 16, 'east'], [6, 16, 'south'], [6, 18, 'east'], [8, 18, 'south'],
    [8, 20, 'east'], [27, 20, 'north'], [27, 14, 'west'], [26, 14, 'north'], [26, 9, 'east'],
    [27, 9, 'north'], [27, 8, 'east'],
  ], { x: 31, y: 8 }),
]);

const uniqueExits = [...new Map(
  billyHillsRouteDefinitions.map(({ exit }) => [`${exit.x},${exit.y}`, exit]),
).values()];

export const billyHillsSpawnPoints = Object.freeze(
  [...new Map(billyHillsRouteDefinitions.map(({ spawn }) => [
    `${spawn.cell.x},${spawn.cell.y}`,
    { cell: { ...spawn.cell }, direction: spawn.direction },
  ])).values()],
);

export const billyHillsExits = Object.freeze(uniqueExits.map((exit) => Object.freeze({ ...exit })));

const redirectsByCell = new Map<string, { cell: { x: number; y: number }; directions: Set<Direction> }>();
for (const routeDefinition of billyHillsRouteDefinitions) {
  for (const redirect of routeDefinition.redirects) {
    const key = `${redirect.cell.x},${redirect.cell.y}`;
    const existing = redirectsByCell.get(key);
    if (existing) {
      for (const direction of redirect.directions) existing.directions.add(direction);
    } else {
      redirectsByCell.set(key, {
        cell: { ...redirect.cell },
        directions: new Set(redirect.directions),
      });
    }
  }
}

/** Union of the possible direction changes consumed by the enemy movement rule. */
export const billyHillsRedirects: readonly WaveRedirect[] = Object.freeze(
  [...redirectsByCell.values()].map(({ cell, directions }) => Object.freeze({
    cell: Object.freeze(cell),
    directions: Object.freeze([...directions]),
  })),
);
