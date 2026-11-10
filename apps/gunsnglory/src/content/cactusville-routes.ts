import type { Direction, WaveRedirect, WaveRouteDefinition, WaveSpawn } from '../game';

type RouteControl = readonly [x: number, y: number, direction: Direction];

const cactusvilleSpawnPoints: readonly WaveSpawn[] = Object.freeze([
  Object.freeze({ cell: Object.freeze({ x: 0, y: 23 }), direction: 'north' as const }),
  Object.freeze({ cell: Object.freeze({ x: 1, y: 23 }), direction: 'north' as const }),
]);

function route(
  spawnIndex: number,
  controls: readonly RouteControl[],
  exit: { x: number; y: number },
): WaveRouteDefinition {
  return {
    spawn: cactusvilleSpawnPoints[spawnIndex]!,
    redirects: controls.map(([x, y, direction]) => ({ cell: { x, y }, directions: [direction] })),
    exit,
  };
}

/** Three complete APK direction-field paths in y-major spawn-pool order. */
export const cactusvilleRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route(0, [
    [0, 17, 'east'], [3, 17, 'north'], [3, 16, 'east'], [5, 16, 'north'], [5, 11, 'west'],
    [3, 11, 'north'], [3, 7, 'east'], [5, 7, 'north'], [5, 2, 'west'],
  ], { x: 0, y: 2 }),
  route(0, [
    [0, 17, 'east'], [3, 17, 'north'], [3, 16, 'east'], [5, 16, 'east'], [8, 16, 'north'],
    [8, 15, 'east'], [15, 15, 'north'], [15, 4, 'west'], [14, 4, 'north'], [14, 2, 'west'],
    [5, 2, 'west'],
  ], { x: 0, y: 2 }),
  route(1, [
    [1, 20, 'east'], [2, 20, 'north'], [2, 18, 'east'], [6, 18, 'north'], [6, 17, 'east'],
    [9, 17, 'north'], [9, 16, 'east'], [16, 16, 'north'], [16, 1, 'west'],
  ], { x: 0, y: 1 }),
]);

export const cactusvilleExits = Object.freeze([{ x: 0, y: 2 }, { x: 0, y: 1 }]);

const redirectsByCell = new Map<string, { cell: { x: number; y: number }; directions: Set<Direction> }>();
for (const routeDefinition of cactusvilleRouteDefinitions) {
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

/** APK code 57 exposes both legal choices at (5,16) for pool 0. */
export const cactusvilleRedirects: readonly WaveRedirect[] = Object.freeze(
  [...redirectsByCell.values()]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x)
    .map(({ cell, directions }) => Object.freeze({
      cell: Object.freeze(cell),
      directions: Object.freeze([...directions]),
    })),
);

export { cactusvilleSpawnPoints };
