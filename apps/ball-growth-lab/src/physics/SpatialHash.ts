import type { Point } from '../types';

export class SpatialHash {
  private readonly cells = new Map<string, Set<number>>();
  private readonly positions = new Map<number, Point>();

  constructor(private readonly cellSize: number) {}

  clear(): void {
    this.cells.clear();
    this.positions.clear();
  }

  insert(id: number, point: Point): void {
    const key = this.key(point);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = new Set();
      this.cells.set(key, bucket);
    }
    bucket.add(id);
    this.positions.set(id, point);
  }

  overlaps(point: Point, radius: number, ignoredIds: ReadonlySet<number> = new Set()): boolean {
    const { x, y } = this.cell(point);
    const range = Math.ceil((radius * 2) / this.cellSize);
    const minDistanceSquared = radius * radius * 4;

    for (let offsetY = -range; offsetY <= range; offsetY += 1) {
      for (let offsetX = -range; offsetX <= range; offsetX += 1) {
        const bucket = this.cells.get(`${x + offsetX}:${y + offsetY}`);
        if (!bucket) continue;
        for (const id of bucket) {
          if (ignoredIds.has(id)) continue;
          const other = this.positions.get(id);
          if (!other) continue;
          const dx = point.x - other.x;
          const dy = point.y - other.y;
          if (dx * dx + dy * dy < minDistanceSquared - 1e-8) return true;
        }
      }
    }
    return false;
  }

  private cell(point: Point): { x: number; y: number } {
    return {
      x: Math.floor(point.x / this.cellSize),
      y: Math.floor(point.y / this.cellSize),
    };
  }

  private key(point: Point): string {
    const { x, y } = this.cell(point);
    return `${x}:${y}`;
  }
}
