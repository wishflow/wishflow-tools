export class PairCooldown {
  private readonly lastContact = new Map<string, number>();

  shouldAccept(firstId: number, secondId: number, time: number, duration: number): boolean {
    const key = firstId < secondId ? `${firstId}:${secondId}` : `${secondId}:${firstId}`;
    const last = this.lastContact.get(key) ?? Number.NEGATIVE_INFINITY;
    if (time - last < duration) return false;
    this.lastContact.set(key, time);
    return true;
  }

  prune(currentTime: number, retention: number): void {
    const expiry = currentTime - retention;
    for (const [key, time] of this.lastContact) {
      if (time < expiry) this.lastContact.delete(key);
    }
  }

  clear(): void {
    this.lastContact.clear();
  }
}
