import { createGame } from '../game';
import { cowGulchContent, cowGulchUpgradeSampleContent } from '../content/cow-gulch';
import { cowGulchDefeatContent } from '../content/cow-gulch-defeat';
import { createProgress } from '../progress';
import { createIndexedDbProfileRepository } from '../progress/indexeddb-profile-repository';

function createSessionId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createBrowserGame() {
  return createGame({
    scenarios: {
      [cowGulchContent.id]: cowGulchContent,
      [cowGulchDefeatContent.id]: cowGulchDefeatContent,
      [cowGulchUpgradeSampleContent.id]: cowGulchUpgradeSampleContent,
    },
    randomSeedSource: () => {
      const seed = new Uint32Array(1);
      globalThis.crypto.getRandomValues(seed);
      return seed[0]!;
    },
    sessionIdSource: createSessionId,
  });
}

export function createBrowserProgress() {
  return createProgress(createIndexedDbProfileRepository());
}
