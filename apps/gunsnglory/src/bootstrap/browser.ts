import { createGame } from '../game';
import { cowGulchContent } from '../content/cow-gulch';

export function createBrowserGame() {
  return createGame({
    scenarios: {
      [cowGulchContent.id]: cowGulchContent,
    },
    randomSeedSource: () => {
      const seed = new Uint32Array(1);
      globalThis.crypto.getRandomValues(seed);
      return seed[0]!;
    },
  });
}
