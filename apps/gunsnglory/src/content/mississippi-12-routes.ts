import type { Direction, WaveRouteDefinition } from '../game';
import map from './mississippi-12.json';

interface RouteField {
  cell: { x: number; y: number };
  code: number;
  kind: 'spawn' | 'turn' | 'exit';
}

const DIRECTIONS_BY_ACTION_ID: readonly (readonly Direction[])[] = Object.freeze([
  ['north'], ['south'], ['west'], ['east'], ['north', 'west'], ['north', 'east'],
  ['north', 'south'], ['west', 'east'], ['west', 'south'], ['east', 'south'],
  ['north', 'west', 'east'], ['west', 'east', 'south'], ['east', 'south', 'north'],
  ['south', 'north', 'west'],
]);

const DIRECTION_VECTORS: Readonly<Record<Direction, { x: number; y: number }>> = Object.freeze({
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
  north: { x: 0, y: -1 },
});

function fieldAt(code: number, x: number, y: number): RouteField | undefined {
  if (code >= 40 && code <= 46) return { cell: { x, y }, code, kind: 'spawn' };
  if (code === 48) return { cell: { x, y }, code, kind: 'exit' };
  if (code >= 52 && code <= 65) return { cell: { x, y }, code, kind: 'turn' };
  return undefined;
}

function cellKey(cell: { x: number; y: number }): string {
  return `${cell.x},${cell.y}`;
}

function spawnDirection(cell: { x: number; y: number }): Direction {
  // Preserve EnemyDirectorField's ordered border checks from the APK.
  if (cell.x >= map.map.width - 1) return 'west';
  if (cell.x === 0) return 'east';
  if (cell.y >= map.map.height - 1) return 'north';
  if (cell.y === 0) return 'south';
  throw new Error(`Mississippi map15 spawn is not on a map edge: ${cellKey(cell)}`);
}

function directionsFor(field: RouteField): readonly Direction[] {
  if (field.kind === 'spawn') return [spawnDirection(field.cell)];
  if (field.kind === 'exit') return [];
  const directions = DIRECTIONS_BY_ACTION_ID[field.code - 52];
  if (!directions) throw new Error(`Mississippi map15 route marker has an unknown action: ${field.code}`);
  return directions;
}

function scanToNextControl(
  fields: ReadonlyMap<string, RouteField>,
  start: { x: number; y: number },
  direction: Direction,
): RouteField | undefined {
  const vector = DIRECTION_VECTORS[direction];
  let x = start.x;
  let y = start.y;
  while (true) {
    x += vector.x;
    y += vector.y;
    if (x < 0 || y < 0 || x >= map.map.width || y >= map.map.height) return undefined;
    const next = fields.get(cellKey({ x, y }));
    if (next?.kind === 'turn' || next?.kind === 'exit') return next;
  }
}

function createRouteDefinitions(): WaveRouteDefinition[] {
  const fields = new Map<string, RouteField>();
  for (const [y, row] of map.originalTileGrid.entries()) {
    for (const [x, code] of row.entries()) {
      const field = fieldAt(code, x, y);
      if (field) fields.set(cellKey(field.cell), field);
    }
  }

  const spawns = [...fields.values()].filter(({ kind }) => kind === 'spawn');
  const routes: WaveRouteDefinition[] = [];
  for (const spawn of spawns) {
    const firstDirection = spawnDirection(spawn.cell);
    const walk = (
      current: RouteField,
      direction: Direction,
      redirects: WaveRouteDefinition['redirects'],
      visited: ReadonlySet<string>,
    ): void => {
      const next = scanToNextControl(fields, current.cell, direction);
      if (!next) throw new Error(`Mississippi map15 route leaves the map from ${cellKey(current.cell)}`);
      const nextKey = cellKey(next.cell);
      if (visited.has(nextKey)) throw new Error(`Mississippi map15 route cycle reaches ${nextKey}`);
      const nextRedirects = current.kind === 'turn'
        ? [...redirects, { cell: current.cell, directions: [direction] }]
        : redirects;
      if (next.kind === 'exit') {
        routes.push({
          spawn: { cell: { ...spawn.cell }, direction: firstDirection },
          redirects: nextRedirects,
          exit: { ...next.cell },
        });
        return;
      }

      const nextVisited = new Set(visited).add(nextKey);
      for (const nextDirection of directionsFor(next)) {
        walk(next, nextDirection, nextRedirects, nextVisited);
      }
    };

    walk(spawn, firstDirection, [], new Set([cellKey(spawn.cell)]));
  }
  if (routes.length === 0) throw new Error('Mississippi map15 has no complete spawn-to-exit routes');
  return routes;
}

/** Complete map15 paths derived from APK action fields 52–65 and its two exits. */
export const mississippi12RouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze(createRouteDefinitions());
