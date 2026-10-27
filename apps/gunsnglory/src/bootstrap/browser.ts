import { createGame } from '../game';
import cowGulch from '../content/cow-gulch.json';

export function createBrowserGame() {
  return createGame({
    scenarios: {
      [cowGulch.id]: cowGulch,
    },
  });
}
