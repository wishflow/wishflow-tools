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

/** Complete directed routes decoded from the APK map14 action fields. */
export const mississippi11RouteDefinitions: readonly WaveRouteDefinition[] = Object.freeze([
  route([0, 15, 'east'], [
    [4, 15, 'north'], [4, 14, 'north'], [4, 3, 'east'], [12, 3, 'east'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([0, 15, 'east'], [
    [4, 15, 'north'], [4, 14, 'east'], [15, 14, 'north'], [15, 9, 'west'], [13, 9, 'north'],
    [13, 4, 'east'], [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([0, 15, 'east'], [
    [4, 15, 'east'], [5, 15, 'north'], [5, 9, 'north'], [5, 4, 'east'], [13, 4, 'east'],
    [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([0, 15, 'east'], [
    [4, 15, 'east'], [5, 15, 'north'], [5, 9, 'east'], [8, 9, 'south'], [8, 10, 'east'],
    [12, 10, 'north'], [12, 3, 'east'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([0, 15, 'east'], [
    [4, 15, 'east'], [5, 15, 'east'], [14, 15, 'north'], [14, 10, 'west'], [13, 10, 'north'],
    [13, 9, 'north'], [13, 4, 'east'], [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([0, 16, 'east'], [
    [5, 16, 'north'], [5, 15, 'north'], [5, 9, 'north'], [5, 4, 'east'], [13, 4, 'east'],
    [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([0, 16, 'east'], [
    [5, 16, 'north'], [5, 15, 'north'], [5, 9, 'east'], [8, 9, 'south'], [8, 10, 'east'],
    [12, 10, 'north'], [12, 3, 'east'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([0, 16, 'east'], [
    [5, 16, 'north'], [5, 15, 'east'], [14, 15, 'north'], [14, 10, 'west'], [13, 10, 'north'],
    [13, 9, 'north'], [13, 4, 'east'], [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([31, 15, 'west'], [
    [26, 15, 'north'], [26, 14, 'west'], [24, 14, 'north'], [24, 7, 'west'], [22, 7, 'north'],
    [22, 3, 'west'], [15, 3, 'north'],
  ], { x: 15, y: 0 }),
  route([31, 15, 'west'], [
    [26, 15, 'north'], [26, 14, 'west'], [24, 14, 'west'], [20, 14, 'south'], [20, 16, 'west'],
    [17, 16, 'north'], [17, 15, 'west'], [15, 15, 'north'], [15, 14, 'north'], [15, 9, 'west'],
    [13, 9, 'north'], [13, 4, 'east'], [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([31, 16, 'west'], [
    [25, 16, 'north'], [25, 15, 'west'], [23, 15, 'north'], [23, 8, 'west'], [21, 8, 'north'],
    [21, 5, 'west'], [20, 5, 'north'], [20, 4, 'west'], [15, 4, 'north'], [15, 3, 'north'],
  ], { x: 15, y: 0 }),
  route([31, 16, 'west'], [
    [25, 16, 'north'], [25, 15, 'west'], [23, 15, 'north'], [23, 8, 'west'], [21, 8, 'west'],
    [16, 8, 'south'], [16, 9, 'west'], [15, 9, 'west'], [13, 9, 'north'], [13, 4, 'east'],
    [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
  route([31, 16, 'west'], [
    [25, 16, 'north'], [25, 15, 'west'], [23, 15, 'west'], [21, 15, 'south'], [21, 17, 'west'],
    [16, 17, 'north'], [16, 16, 'west'], [14, 16, 'north'], [14, 15, 'north'], [14, 10, 'west'],
    [13, 10, 'north'], [13, 9, 'north'], [13, 4, 'east'], [14, 4, 'north'], [14, 3, 'north'],
  ], { x: 14, y: 0 }),
]);
