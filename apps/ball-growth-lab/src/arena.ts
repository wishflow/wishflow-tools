import {
  ARENA_HALF_EXTENT,
  type ArenaShape,
  type Point,
  type SimulationConfig,
} from './types';

export interface BoundarySegment {
  from: Point;
  to: Point;
}

export interface GapArc {
  center: number;
  width: number;
}

export interface BoundaryPath {
  points: Point[];
  loop: boolean;
}

export function getArenaHalfExtent(config: Pick<SimulationConfig, 'arenaSize'>): number {
  return config.arenaSize / 2;
}

export function getPerimeter(shape: ArenaShape, halfExtent = ARENA_HALF_EXTENT): number {
  return shape === 'square' ? halfExtent * 8 : Math.PI * 2 * halfExtent;
}

export function getGapArcs(config: Pick<SimulationConfig, 'shape' | 'arenaSize' | 'gapCount' | 'ballDiameterRatio' | 'gapWidthRatio'>): GapArc[] {
  if (config.gapCount <= 0) return [];
  const halfExtent = getArenaHalfExtent(config);
  const perimeter = getPerimeter(config.shape, halfExtent);
  const ballDiameter = config.arenaSize * config.ballDiameterRatio;
  const width = Math.min(ballDiameter * config.gapWidthRatio, perimeter / (config.gapCount * 1.8));
  return Array.from({ length: config.gapCount }, (_, index) => ({
    center: (perimeter * index) / config.gapCount,
    width,
  }));
}

export function pointAtBoundaryDistance(
  shape: ArenaShape,
  distance: number,
  halfExtent = ARENA_HALF_EXTENT,
): Point {
  const perimeter = getPerimeter(shape, halfExtent);
  const normalized = ((distance % perimeter) + perimeter) % perimeter;

  if (shape === 'circle') {
    const angle = -Math.PI / 2 + normalized / halfExtent;
    return { x: halfExtent * Math.cos(angle), y: halfExtent * Math.sin(angle) };
  }

  const side = halfExtent * 2;
  if (normalized < halfExtent) return { x: normalized, y: -halfExtent };
  if (normalized < halfExtent + side) return { x: halfExtent, y: -halfExtent + normalized - halfExtent };
  if (normalized < halfExtent + side * 2) return { x: halfExtent - (normalized - halfExtent - side), y: halfExtent };
  if (normalized < halfExtent + side * 3) return { x: -halfExtent, y: halfExtent - (normalized - halfExtent - side * 2) };
  return { x: -halfExtent + normalized - halfExtent - side * 3, y: -halfExtent };
}

function splitWrappedInterval(start: number, end: number, perimeter: number): Array<[number, number]> {
  if (start < 0) return [[0, end], [perimeter + start, perimeter]];
  if (end > perimeter) return [[start, perimeter], [0, end - perimeter]];
  return [[start, end]];
}

function visibleIntervals(config: SimulationConfig): Array<[number, number]> {
  const perimeter = getPerimeter(config.shape, getArenaHalfExtent(config));
  const gaps = getGapArcs(config)
    .flatMap(({ center, width }) => splitWrappedInterval(center - width / 2, center + width / 2, perimeter))
    .sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];

  for (const interval of gaps) {
    const last = merged.at(-1);
    if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
    else merged.push([...interval]);
  }

  const visible: Array<[number, number]> = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) visible.push([cursor, start]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < perimeter) visible.push([cursor, perimeter]);
  return visible;
}

function splitSquareInterval(start: number, end: number, h: number): number[] {
  const corners = [0, h, h * 3, h * 5, h * 7, h * 8];
  return [start, ...corners.filter((corner) => corner > start && corner < end), end];
}

export function buildBoundarySegments(config: SimulationConfig): BoundarySegment[] {
  const segments: BoundarySegment[] = [];
  for (const path of buildBoundaryPaths(config)) {
    const pairCount = path.loop ? path.points.length : path.points.length - 1;
    for (let index = 0; index < pairCount; index += 1) {
      segments.push({
        from: path.points[index],
        to: path.points[(index + 1) % path.points.length],
      });
    }
  }
  return segments;
}

export function buildBoundaryPaths(config: SimulationConfig): BoundaryPath[] {
  const halfExtent = getArenaHalfExtent(config);
  if (config.gapCount === 0) {
    if (config.shape === 'square') {
      const extent = halfExtent;
      return [{
        loop: true,
        points: [
          { x: -extent, y: -extent },
          { x: extent, y: -extent },
          { x: extent, y: extent },
          { x: -extent, y: extent },
        ],
      }];
    }
    const pointCount = 96;
    const perimeter = getPerimeter(config.shape, halfExtent);
    return [{
      loop: true,
      points: Array.from({ length: pointCount }, (_, index) => pointAtBoundaryDistance(config.shape, (perimeter * index) / pointCount, halfExtent)),
    }];
  }

  return visibleIntervals(config).map(([start, end]) => {
    if (config.shape === 'square') {
      return { loop: false, points: splitSquareInterval(start, end, halfExtent).map((distance) => pointAtBoundaryDistance(config.shape, distance, halfExtent)) };
    }
    const slices = Math.max(1, Math.ceil(((end - start) / halfExtent) / 0.055));
    return {
      loop: false,
      points: Array.from({ length: slices + 1 }, (_, index) => pointAtBoundaryDistance(config.shape, start + ((end - start) * index) / slices, halfExtent)),
    };
  });
}

export function isInsideArena(shape: ArenaShape, point: Point, radius: number, halfExtent = ARENA_HALF_EXTENT): boolean {
  const limit = halfExtent - radius;
  if (shape === 'square') return Math.abs(point.x) <= limit && Math.abs(point.y) <= limit;
  return Math.hypot(point.x, point.y) <= limit;
}
