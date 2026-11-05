import type { Direction, WaveRouteDefinition } from '../game';

type RouteStep = readonly [x: number, y: number, direction: Direction];

function route(
  spawn: RouteStep,
  redirects: readonly RouteStep[],
  exit: { x: number; y: number },
): WaveRouteDefinition {
  return {
    spawn: { cell: { x: spawn[0], y: spawn[1] }, direction: spawn[2] },
    redirects: redirects.map(([x, y, direction]) => ({
      cell: { x, y },
      directions: [direction],
    })),
    exit: { ...exit },
  };
}

/** All directed routes derived from the APK map fields and PriorityMap recursion. */
export const techTownRouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route([0, 3, 'east'], [
    [8, 3, 'south'], [8, 9, 'east'], [11, 9, 'east'], [25, 9, 'south'], [25, 17, 'east'],
  ], { x: 31, y: 17 }),
  route([0, 4, 'east'], [
    [7, 4, 'south'], [7, 10, 'east'], [12, 10, 'east'], [24, 10, 'south'], [24, 18, 'east'],
  ], { x: 31, y: 18 }),
  route([11, 23, 'north'], [
    [11, 21, 'west'], [9, 21, 'north'], [9, 15, 'east'], [11, 15, 'north'],
    [11, 9, 'east'], [25, 9, 'south'], [25, 17, 'east'],
  ], { x: 31, y: 17 }),
  route([12, 23, 'north'], [
    [12, 20, 'west'], [10, 20, 'north'], [10, 16, 'east'], [12, 16, 'north'],
    [12, 10, 'east'], [24, 10, 'south'], [24, 18, 'east'],
  ], { x: 31, y: 18 }),
]);
