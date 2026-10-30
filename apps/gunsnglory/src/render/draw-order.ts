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
