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

/** All ten static paths through the original Lost City direction field. */
export const lostCityRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route([9, 0, 'south'], [
    [9, 3, 'west'], [7, 3, 'south'], [7, 8, 'west'], [3, 8, 'south'], [3, 9, 'west'], [2, 9, 'south'],
    [2, 13, 'east'], [3, 13, 'south'], [3, 14, 'east'], [7, 14, 'south'], [7, 18, 'east'], [9, 18, 'south'],
    [9, 19, 'east'], [11, 19, 'south'],
  ], { x: 11, y: 23 }),
  route([9, 0, 'south'], [
    [9, 3, 'west'], [7, 3, 'south'], [7, 8, 'east'], [11, 8, 'south'], [11, 14, 'west'], [7, 14, 'south'],
    [7, 18, 'east'], [9, 18, 'south'], [9, 19, 'east'], [11, 19, 'south'],
  ], { x: 11, y: 23 }),
  route([9, 0, 'south'], [
    [9, 3, 'west'], [7, 3, 'south'], [7, 8, 'east'], [11, 8, 'south'], [11, 14, 'east'], [15, 14, 'south'],
    [15, 19, 'west'], [11, 19, 'south'],
  ], { x: 11, y: 23 }),
  route([10, 0, 'south'], [
    [10, 3, 'east'], [14, 3, 'south'], [14, 8, 'west'], [11, 8, 'south'], [11, 14, 'west'], [7, 14, 'south'],
    [7, 18, 'east'], [9, 18, 'south'], [9, 19, 'east'], [11, 19, 'south'],
  ], { x: 11, y: 23 }),
  route([10, 0, 'south'], [
    [10, 3, 'east'], [14, 3, 'south'], [14, 8, 'west'], [11, 8, 'south'], [11, 14, 'east'], [15, 14, 'south'],
    [15, 19, 'west'], [11, 19, 'south'],
  ], { x: 11, y: 23 }),
  route([18, 0, 'south'], [
    [18, 3, 'west'], [15, 3, 'south'], [15, 8, 'east'], [18, 8, 'south'], [18, 14, 'west'], [16, 14, 'south'],
    [16, 19, 'east'], [19, 19, 'south'],
  ], { x: 19, y: 23 }),
  route([18, 0, 'south'], [
    [18, 3, 'west'], [15, 3, 'south'], [15, 8, 'east'], [18, 8, 'south'], [18, 14, 'east'], [23, 14, 'south'],
    [23, 19, 'west'], [19, 19, 'south'],
  ], { x: 19, y: 23 }),
  route([19, 0, 'south'], [
    [19, 3, 'east'], [22, 3, 'south'], [22, 8, 'west'], [18, 8, 'south'], [18, 14, 'west'], [16, 14, 'south'],
    [16, 19, 'east'], [19, 19, 'south'],
  ], { x: 19, y: 23 }),
  route([19, 0, 'south'], [
    [19, 3, 'east'], [22, 3, 'south'], [22, 8, 'west'], [18, 8, 'south'], [18, 14, 'east'], [23, 14, 'south'],
    [23, 19, 'west'], [19, 19, 'south'],
  ], { x: 19, y: 23 }),
  route([19, 0, 'south'], [
    [19, 3, 'east'], [22, 3, 'south'], [22, 8, 'east'], [24, 8, 'south'], [24, 10, 'east'], [26, 10, 'south'],
    [26, 14, 'west'], [23, 14, 'south'], [23, 19, 'west'], [19, 19, 'south'],
  ], { x: 19, y: 23 }),
]);

export const lostCitySpawnPoints: readonly WaveSpawn[] = Object.freeze([
  Object.freeze({ cell: Object.freeze({ x: 9, y: 0 }), direction: 'south' as const }),
  Object.freeze({ cell: Object.freeze({ x: 10, y: 0 }), direction: 'south' as const }),
  Object.freeze({ cell: Object.freeze({ x: 18, y: 0 }), direction: 'south' as const }),
  Object.freeze({ cell: Object.freeze({ x: 19, y: 0 }), direction: 'south' as const }),
]);

export const lostCityExits = Object.freeze([
  Object.freeze({ x: 11, y: 23 }),
  Object.freeze({ x: 19, y: 23 }),
]);

/** PriorityMap's original left-to-right edge order is significant at each fork. */
export const lostCityRedirects: readonly WaveRedirect[] = Object.freeze([
  { cell: { x: 7, y: 3 }, directions: ['south'] },
  { cell: { x: 9, y: 3 }, directions: ['west'] },
  { cell: { x: 10, y: 3 }, directions: ['east'] },
  { cell: { x: 14, y: 3 }, directions: ['south'] },
  { cell: { x: 15, y: 3 }, directions: ['south'] },
  { cell: { x: 18, y: 3 }, directions: ['west'] },
  { cell: { x: 19, y: 3 }, directions: ['east'] },
  { cell: { x: 22, y: 3 }, directions: ['south'] },
  { cell: { x: 3, y: 8 }, directions: ['south'] },
  { cell: { x: 7, y: 8 }, directions: ['west', 'east'] },
  { cell: { x: 11, y: 8 }, directions: ['south'] },
  { cell: { x: 14, y: 8 }, directions: ['west'] },
  { cell: { x: 15, y: 8 }, directions: ['east'] },
  { cell: { x: 18, y: 8 }, directions: ['south'] },
  { cell: { x: 22, y: 8 }, directions: ['west', 'east'] },
  { cell: { x: 24, y: 8 }, directions: ['south'] },
  { cell: { x: 2, y: 9 }, directions: ['south'] },
  { cell: { x: 3, y: 9 }, directions: ['west'] },
  { cell: { x: 24, y: 10 }, directions: ['east'] },
  { cell: { x: 26, y: 10 }, directions: ['south'] },
  { cell: { x: 2, y: 13 }, directions: ['east'] },
  { cell: { x: 3, y: 13 }, directions: ['south'] },
  { cell: { x: 3, y: 14 }, directions: ['east'] },
  { cell: { x: 7, y: 14 }, directions: ['south'] },
  { cell: { x: 11, y: 14 }, directions: ['west', 'east'] },
  { cell: { x: 15, y: 14 }, directions: ['south'] },
  { cell: { x: 16, y: 14 }, directions: ['south'] },
  { cell: { x: 18, y: 14 }, directions: ['west', 'east'] },
  { cell: { x: 23, y: 14 }, directions: ['south'] },
  { cell: { x: 26, y: 14 }, directions: ['west'] },
  { cell: { x: 7, y: 18 }, directions: ['east'] },
  { cell: { x: 9, y: 18 }, directions: ['south'] },
  { cell: { x: 9, y: 19 }, directions: ['east'] },
  { cell: { x: 11, y: 19 }, directions: ['south'] },
  { cell: { x: 15, y: 19 }, directions: ['west'] },
  { cell: { x: 16, y: 19 }, directions: ['east'] },
  { cell: { x: 19, y: 19 }, directions: ['south'] },
  { cell: { x: 23, y: 19 }, directions: ['west'] },
]);
