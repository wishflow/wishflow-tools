import assert from 'node:assert/strict';
import test from 'node:test';
import { I_ZOMBIE_LEVELS, MINI_GAMES, VASEBREAKER_LEVELS } from '../src/modes/levelCatalog';
import { collectUnlockedModeIds } from '../src/game/modeProgression';

test('mode unlocks follow Adventure gates and sequential arcade completions', () => {
  assert.deepEqual(collectUnlockedModeIds({ adventure: { completedLevels: [] }, completedModes: [], unlockedModes: [] }), []);

  const afterMiniGameGift = collectUnlockedModeIds({ adventure: { completedLevels: ['3-2'] }, completedModes: [], unlockedModes: [] });
  assert.deepEqual(afterMiniGameGift, MINI_GAMES.slice(0, 3).map((mode) => mode.id));

  const afterAdventure = collectUnlockedModeIds({ adventure: { completedLevels: ['3-2', '4-6', '5-10'] }, completedModes: [], unlockedModes: [] });
  assert.deepEqual(afterAdventure, [
    ...MINI_GAMES.slice(0, 3).map((mode) => mode.id),
    VASEBREAKER_LEVELS[0]!.id,
    I_ZOMBIE_LEVELS[0]!.id,
  ]);

  const completedFirstThree = MINI_GAMES.slice(0, 3).map((mode) => mode.id);
  const afterMiniGames = collectUnlockedModeIds({
    adventure: { completedLevels: ['3-2', '5-10'] },
    completedModes: completedFirstThree,
    unlockedModes: completedFirstThree,
  });
  assert.ok(afterMiniGames.includes(MINI_GAMES[3]!.id));
  assert.equal(afterMiniGames.includes(MINI_GAMES[4]!.id), false);

  const afterFirstVase = collectUnlockedModeIds({
    adventure: { completedLevels: ['4-6'] },
    completedModes: [VASEBREAKER_LEVELS[0]!.id],
    unlockedModes: [VASEBREAKER_LEVELS[0]!.id, I_ZOMBIE_LEVELS[0]!.id],
  });
  assert.ok(afterFirstVase.includes(VASEBREAKER_LEVELS[1]!.id));
  assert.ok(afterFirstVase.includes(I_ZOMBIE_LEVELS[0]!.id));
  assert.equal(afterFirstVase.includes(I_ZOMBIE_LEVELS[1]!.id), false);
});
