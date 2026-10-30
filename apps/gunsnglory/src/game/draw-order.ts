export type DrawOrderKind = 'decoration' | 'unit' | 'enemy' | 'shot' | 'wagon-debris';

export interface DrawOrderEntry {
  id: string;
  kind: DrawOrderKind;
  depth: number;
  cell?: { x: number; y: number };
}

export const GAME_DRAW_ORDER_ROAD_CUTOFF = 768_000;

/** Persistent counterpart of the APK's GameObjectManager draw-order vector. */
export class DrawOrderQueue {
  private readonly order: string[] = [];
  private readonly depths = new Map<string, number>();

  items(): readonly string[] {
    return [...this.order];
  }

  depth(id: string): number | undefined {
    return this.depths.get(id);
  }

  insert(id: string, depth: number): void {
    this.remove(id);
    let index = 0;
    while (index < this.order.length && this.depths.get(this.order[index]!)! < depth) index += 1;
    this.order.splice(index, 0, id);
    this.depths.set(id, depth);
  }

  correct(id: string, depth: number, movingUp: boolean): void {
    const currentIndex = this.order.indexOf(id);
    if (currentIndex < 0) {
      this.insert(id, depth);
      return;
    }

    this.depths.set(id, depth);
    let index = currentIndex;
    if (movingUp) {
      while (index > 0) {
        const previous = this.order[index - 1]!;
        if (depth >= this.depths.get(previous)!) break;
        this.order[index] = previous;
        this.order[index - 1] = id;
        index -= 1;
      }
      return;
    }

    while (index < this.order.length - 1) {
      const next = this.order[index + 1]!;
      if (depth <= this.depths.get(next)!) break;
      this.order[index] = next;
      this.order[index + 1] = id;
      index += 1;
    }
  }

  remove(id: string): void {
    const index = this.order.indexOf(id);
    if (index >= 0) this.order.splice(index, 1);
    this.depths.delete(id);
  }
}

/** Applies one Game step in the original object update phases. */
export function synchronizeDrawOrder(queue: DrawOrderQueue, entries: readonly DrawOrderEntry[]): void {
  const currentIds = new Set(entries.map(({ id }) => id));
  for (const id of queue.items()) {
    if (!currentIds.has(id)) queue.remove(id);
  }

  const knownIds = new Set(queue.items());
  const phases: readonly DrawOrderKind[] = ['enemy', 'unit', 'shot', 'wagon-debris', 'decoration'];
  for (const kind of phases) {
    for (const entry of entries) {
      if (entry.kind !== kind || !knownIds.has(entry.id)) continue;
      const previousDepth = queue.depth(entry.id);
      if (previousDepth === undefined || previousDepth === entry.depth) continue;
      queue.correct(entry.id, entry.depth, entry.depth < previousDepth);
    }
    for (const entry of entries) {
      if (entry.kind === kind && !knownIds.has(entry.id)) queue.insert(entry.id, entry.depth);
    }
  }
}
