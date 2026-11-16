import type { Direction, PreviewWaveDefinition, WaveRedirect } from './index';

/** Direction order recovered from EnemyDirectorField's APK action-2 mapping. */
const DIRECTIONS_BY_ACTION_ID: readonly (readonly Direction[])[] = Object.freeze([
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
]);

/**
 * Rebuilds the shared APK turn table from complete spawn-to-exit routes.
 * The APK chooses from every direction on an action-2 field, regardless of
 * which spawn route caused the enemy to reach that field.
 */
export function runtimeWaveRedirects(
  definition: PreviewWaveDefinition | undefined,
  originalTileGrid?: readonly (readonly number[])[],
): readonly WaveRedirect[] {
  if (!definition?.routes?.length) return definition?.redirects ?? [];

  // Scenario fixtures and derived variants often replace `redirects` while
  // retaining the source route metadata. Treat that explicit divergence as an
  // override; official content keeps this table equal to its first route and
  // can safely rebuild the shared TDM direction table from every route.
  const firstRouteRedirects = definition.routes[0]?.redirects ?? [];
  const firstRoute = definition.routes[0]!;
  const spawnMatchesFirstRoute = definition.spawn.cell.x === firstRoute.spawn.cell.x
    && definition.spawn.cell.y === firstRoute.spawn.cell.y
    && definition.spawn.direction === firstRoute.spawn.direction;
  const exitMatchesFirstRoute = definition.exit.x === firstRoute.exit.x
    && definition.exit.y === firstRoute.exit.y;
  const hasExplicitRedirectOverride = !spawnMatchesFirstRoute
    || !exitMatchesFirstRoute
    || definition.redirects.length !== firstRouteRedirects.length
    || definition.redirects.some((redirect, index) => {
      const source = firstRouteRedirects[index];
      return !source
        || redirect.cell.x !== source.cell.x
        || redirect.cell.y !== source.cell.y
        || redirect.directions.length !== source.directions.length
        || redirect.directions.some((direction, directionIndex) => direction !== source.directions[directionIndex]);
    });
  if (hasExplicitRedirectOverride) return definition.redirects;

  const cells = new Map<string, { cell: { x: number; y: number }; directions: Direction[] }>();
  for (const route of definition.routes) {
    for (const redirect of route.redirects) {
      const key = `${redirect.cell.x},${redirect.cell.y}`;
      const current = cells.get(key);
      if (current) {
        for (const direction of redirect.directions) {
          if (!current.directions.includes(direction)) current.directions.push(direction);
        }
      } else {
        cells.set(key, { cell: { ...redirect.cell }, directions: [...redirect.directions] });
      }
    }
  }

  // Every official TDM action-2 field is present in at least one complete
  // spawn-to-exit route. Restrict raw-grid expansion to those routed cells so
  // a custom route fixture that retains a map grid cannot acquire unrelated
  // branches from the original scenario.
  return [...cells.values()].map(({ cell, directions }) => {
    const marker = originalTileGrid?.[cell.y]?.[cell.x];
    const actionDirections = marker !== undefined && marker >= 52 && marker <= 65
      ? DIRECTIONS_BY_ACTION_ID[marker - 52]
      : undefined;
    if (actionDirections && directions.every((direction) => actionDirections.includes(direction))) {
      return { cell, directions: actionDirections };
    }
    return { cell, directions };
  });
}
