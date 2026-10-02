export function seedToUint32(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRandom(seed: string): () => number {
  let state = seedToUint32(seed) || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeed(): string {
  const words = new Uint16Array(2);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(words);
  } else {
    words[0] = Math.floor(Math.random() * 65536);
    words[1] = Math.floor(Math.random() * 65536);
  }
  return `LAB-${words[0].toString(16).padStart(4, '0')}${words[1].toString(16).padStart(4, '0')}`.toUpperCase();
}
