import type { Direction, WaveRedirect, WaveRouteDefinition, WaveSpawn } from '../game';

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

/** All 14 concrete paths through the two APK direction fields, in map graph order. */
export const railroadRanchRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route([31, 6, 'west'], [
    [26, 6, 'north'], [26, 1, 'west'], [15, 1, 'west'], [4, 1, 'south'], [4, 5, 'west'],
  ], { x: 0, y: 5 }),
  route([31, 6, 'west'], [
    [26, 6, 'north'], [26, 1, 'west'], [15, 1, 'south'], [15, 7, 'west'], [11, 7, 'south'], [11, 8, 'west'],
    [9, 8, 'south'], [9, 11, 'west'], [5, 11, 'north'], [5, 8, 'west'], [4, 8, 'north'], [4, 5, 'west'],
  ], { x: 0, y: 5 }),
  route([31, 6, 'west'], [
    [26, 6, 'north'], [26, 1, 'west'], [15, 1, 'south'], [15, 7, 'west'], [11, 7, 'south'], [11, 8, 'west'],
    [9, 8, 'south'], [9, 11, 'west'], [5, 11, 'south'], [5, 16, 'west'],
  ], { x: 0, y: 16 }),
  route([31, 6, 'west'], [
    [26, 6, 'south'], [26, 11, 'west'], [22, 11, 'north'], [22, 7, 'west'], [15, 7, 'west'], [11, 7, 'south'],
    [11, 8, 'west'], [9, 8, 'south'], [9, 11, 'west'], [5, 11, 'north'], [5, 8, 'west'], [4, 8, 'north'], [4, 5, 'west'],
  ], { x: 0, y: 5 }),
  route([31, 6, 'west'], [
    [26, 6, 'south'], [26, 11, 'west'], [22, 11, 'north'], [22, 7, 'west'], [15, 7, 'west'], [11, 7, 'south'],
    [11, 8, 'west'], [9, 8, 'south'], [9, 11, 'west'], [5, 11, 'south'], [5, 16, 'west'],
  ], { x: 0, y: 16 }),
  route([31, 6, 'west'], [
    [26, 6, 'south'], [26, 11, 'west'], [22, 11, 'south'], [22, 13, 'west'], [17, 13, 'south'], [17, 14, 'west'],
    [14, 14, 'west'], [9, 14, 'north'], [9, 11, 'west'], [5, 11, 'north'], [5, 8, 'west'], [4, 8, 'north'], [4, 5, 'west'],
  ], { x: 0, y: 5 }),
  route([31, 6, 'west'], [
    [26, 6, 'south'], [26, 11, 'west'], [22, 11, 'south'], [22, 13, 'west'], [17, 13, 'south'], [17, 14, 'west'],
    [14, 14, 'west'], [9, 14, 'north'], [9, 11, 'west'], [5, 11, 'south'], [5, 16, 'west'],
  ], { x: 0, y: 16 }),
  route([31, 17, 'west'], [
    [26, 17, 'north'], [26, 11, 'west'], [22, 11, 'north'], [22, 7, 'west'], [15, 7, 'west'], [11, 7, 'south'],
    [11, 8, 'west'], [9, 8, 'south'], [9, 11, 'west'], [5, 11, 'north'], [5, 8, 'west'], [4, 8, 'north'], [4, 5, 'west'],
  ], { x: 0, y: 5 }),
  route([31, 17, 'west'], [
    [26, 17, 'north'], [26, 11, 'west'], [22, 11, 'north'], [22, 7, 'west'], [15, 7, 'west'], [11, 7, 'south'],
    [11, 8, 'west'], [9, 8, 'south'], [9, 11, 'west'], [5, 11, 'south'], [5, 16, 'west'],
  ], { x: 0, y: 16 }),
  route([31, 17, 'west'], [
    [26, 17, 'north'], [26, 11, 'west'], [22, 11, 'south'], [22, 13, 'west'], [17, 13, 'south'], [17, 14, 'west'],
    [14, 14, 'west'], [9, 14, 'north'], [9, 11, 'west'], [5, 11, 'north'], [5, 8, 'west'], [4, 8, 'north'], [4, 5, 'west'],
  ], { x: 0, y: 5 }),
  route([31, 17, 'west'], [
    [26, 17, 'north'], [26, 11, 'west'], [22, 11, 'south'], [22, 13, 'west'], [17, 13, 'south'], [17, 14, 'west'],
    [14, 14, 'west'], [9, 14, 'north'], [9, 11, 'west'], [5, 11, 'south'], [5, 16, 'west'],
  ], { x: 0, y: 16 }),
  route([31, 17, 'west'], [
    [26, 17, 'south'], [26, 21, 'west'], [20, 21, 'north'], [20, 20, 'west'], [14, 20, 'north'], [14, 14, 'west'],
    [9, 14, 'north'], [9, 11, 'west'], [5, 11, 'north'], [5, 8, 'west'], [4, 8, 'north'], [4, 5, 'west'],
  ], { x: 0, y: 5 }),
  route([31, 17, 'west'], [
    [26, 17, 'south'], [26, 21, 'west'], [20, 21, 'north'], [20, 20, 'west'], [14, 20, 'north'], [14, 14, 'west'],
    [9, 14, 'north'], [9, 11, 'west'], [5, 11, 'south'], [5, 16, 'west'],
  ], { x: 0, y: 16 }),
  route([31, 17, 'west'], [
    [26, 17, 'south'], [26, 21, 'west'], [20, 21, 'north'], [20, 20, 'west'], [14, 20, 'west'], [5, 20, 'north'], [5, 16, 'west'],
  ], { x: 0, y: 16 }),
]);

export const railroadRanchSpawnPoints: readonly WaveSpawn[] = Object.freeze([
  Object.freeze({ cell: Object.freeze({ x: 31, y: 6 }), direction: 'west' as const }),
  Object.freeze({ cell: Object.freeze({ x: 31, y: 17 }), direction: 'west' as const }),
]);

export const railroadRanchExits = Object.freeze([
  Object.freeze({ x: 0, y: 5 }),
  Object.freeze({ x: 0, y: 16 }),
]);

/** Original edge order controls which route a matched random index selects at each junction. */
export const railroadRanchRedirects: readonly WaveRedirect[] = Object.freeze([
  { cell: { x: 4, y: 1 }, directions: ['south'] },
  { cell: { x: 15, y: 1 }, directions: ['west', 'south'] },
  { cell: { x: 26, y: 1 }, directions: ['west'] },
  { cell: { x: 4, y: 5 }, directions: ['west'] },
  { cell: { x: 26, y: 6 }, directions: ['north', 'south'] },
  { cell: { x: 11, y: 7 }, directions: ['south'] },
  { cell: { x: 15, y: 7 }, directions: ['west'] },
  { cell: { x: 22, y: 7 }, directions: ['west'] },
  { cell: { x: 4, y: 8 }, directions: ['north'] },
  { cell: { x: 5, y: 8 }, directions: ['west'] },
  { cell: { x: 9, y: 8 }, directions: ['south'] },
  { cell: { x: 11, y: 8 }, directions: ['west'] },
  { cell: { x: 5, y: 11 }, directions: ['north', 'south'] },
  { cell: { x: 9, y: 11 }, directions: ['west'] },
  { cell: { x: 22, y: 11 }, directions: ['north', 'south'] },
  { cell: { x: 26, y: 11 }, directions: ['west'] },
  { cell: { x: 17, y: 13 }, directions: ['south'] },
  { cell: { x: 22, y: 13 }, directions: ['west'] },
  { cell: { x: 9, y: 14 }, directions: ['north'] },
  { cell: { x: 14, y: 14 }, directions: ['west'] },
  { cell: { x: 17, y: 14 }, directions: ['west'] },
  { cell: { x: 5, y: 16 }, directions: ['west'] },
  { cell: { x: 26, y: 17 }, directions: ['north', 'south'] },
  { cell: { x: 5, y: 20 }, directions: ['north'] },
  { cell: { x: 14, y: 20 }, directions: ['north', 'west'] },
  { cell: { x: 20, y: 20 }, directions: ['west'] },
  { cell: { x: 20, y: 21 }, directions: ['north'] },
  { cell: { x: 26, y: 21 }, directions: ['west'] },
]);
