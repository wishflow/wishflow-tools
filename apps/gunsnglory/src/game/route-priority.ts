import type { Direction, ScenarioContent } from './index';

export interface RoutePriorityMap {
  minValue: number;
  get(x: number, y: number): number;
  getTargetPriority(x: number, y: number): number;
}

export function createRoutePriorityMap(scenario: ScenarioContent): RoutePriorityMap {
  const definition = scenario.previewWave;
  const values = new Map<string, number>();
  // APK PriorityMap.get() returns 0 out of bounds; UnitDirector.getPrio() returns -1 there.
  const get = (x: number, y: number) =>
    x < 0 || y < 0 || x >= scenario.map.width || y >= scenario.map.height ? 0 : values.get(`${x},${y}`) ?? 0;
  const getTargetPriority = (x: number, y: number) =>
    x < 0 || y < 0 || x >= scenario.map.width || y >= scenario.map.height ? -1 : values.get(`${x},${y}`) ?? 0;
  const empty = () => ({ minValue: 255, get, getTargetPriority });
  if (!definition) return empty();

  const waypoints = [definition.spawn.cell, ...definition.redirects.map(({ cell }) => cell), definition.exit];
  const spawnFields = [definition.spawn, ...(definition.additionalSpawns ?? [])];
  const segmentDirections: Array<Direction | undefined> = [
    definition.spawn.direction,
    ...definition.redirects.map(({ directions }) => directions.length === 1 ? directions[0] : undefined),
  ];
  const directionVectors: Readonly<Record<Direction, { x: number; y: number }>> = {
    east: { x: 1, y: 0 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
    north: { x: 0, y: -1 },
  };
  const cells: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const start = waypoints[index]!;
    const end = waypoints[index + 1]!;
    const direction = segmentDirections[index];
    if (!direction) return empty();
    if (start.x !== end.x && start.y !== end.y) {
      return empty();
    }
    const dx = Math.sign(end.x - start.x);
    const dy = Math.sign(end.y - start.y);
    const expected = directionVectors[direction];
    if (dx !== expected.x || dy !== expected.y) return empty();
    const steps = Math.abs(end.x - start.x) + Math.abs(end.y - start.y);
    for (let step = 0; step < steps; step += 1) {
      const cell = { x: start.x + (dx * step), y: start.y + (dy * step) };
      if (cells.at(-1)?.x !== cell.x || cells.at(-1)?.y !== cell.y) cells.push(cell);
    }
  }
  const last = waypoints.at(-1)!;
  if (cells.at(-1)?.x !== last.x || cells.at(-1)?.y !== last.y) cells.push({ x: last.x, y: last.y });

  const spawnIndexes: number[] = [];
  for (const spawn of spawnFields) {
    const spawnIndex = cells.findIndex((cell) => cell.x === spawn.cell.x && cell.y === spawn.cell.y);
    const next = cells[spawnIndex + 1];
    const direction = directionVectors[spawn.direction];
    if (spawnIndex < 0 || !next || next.x - spawn.cell.x !== direction.x || next.y - spawn.cell.y !== direction.y) {
      return empty();
    }
    spawnIndexes.push(spawnIndex);
  }

  // Each APK action-1 field starts its own recursion in map scan order. Shared downstream values take
  // the greater score, while the start field itself is overwritten with that recursion's return value.
  const exitKey = `${last.x},${last.y}`;
  values.set(exitKey, 255);
  const redirectKeys = new Set(definition.redirects.map(({ cell }) => `${cell.x},${cell.y}`));
  let minValue = 255;
  for (const spawnIndex of spawnIndexes) {
    const recursiveValues = new Map<string, number>([[exitKey, 255]]);
    for (let index = cells.length - 2; index > spawnIndex; index -= 1) {
      const cell = cells[index]!;
      const next = cells[index + 1]!;
      const key = `${cell.x},${cell.y}`;
      const candidate = recursiveValues.get(`${next.x},${next.y}`)! - 1;
      recursiveValues.set(key, candidate);
      if (redirectKeys.has(key)) minValue = Math.min(minValue, candidate);
      if ((values.get(key) ?? 0) < candidate) values.set(key, candidate);
    }
    const spawn = cells[spawnIndex]!;
    const next = cells[spawnIndex + 1]!;
    values.set(`${spawn.x},${spawn.y}`, recursiveValues.get(`${next.x},${next.y}`)!);
  }

  return { minValue, get, getTargetPriority };
}

export function normalizedRoutePriority(
  priorityMap: RoutePriorityMap,
  cellX: number,
  cellY: number,
): number {
  const mapPriority = priorityMap.get(cellX, cellY);
  const range = 255 - priorityMap.minValue;
  if (range <= 0) return 0;
  return Math.trunc(((mapPriority - priorityMap.minValue) * 1000) / range);
}
