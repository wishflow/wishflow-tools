import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cowGulchAmbientMusic,
  cowGulchBattleMusicForWave,
  cowGulchVictoryMusic,
} from '../src/content/cow-gulch-music';

test('maps Cow Gulch ambient, battle, and victory music to the researched APK tracks', () => {
  assert.equal(cowGulchAmbientMusic, 'music_loop1');
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6, 7, 8].map(cowGulchBattleMusicForWave),
    ['music_loop2', 'music_loop3', 'music_loop4', 'music_loop2', 'music_loop3', 'music_loop4', 'music_loop2', 'music_loop3', 'music_loop4'],
  );
  assert.equal(cowGulchVictoryMusic, 'music_level_won');
});

test('rejects invalid wave values before selecting a loop', () => {
  for (const wave of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => cowGulchBattleMusicForWave(wave), RangeError);
  }
});
