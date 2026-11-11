import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  mississippi11AmbientMusic,
  mississippi11BattleMusicForWave,
  mississippi11BattleMusicLoops,
} from '../src/content/mississippi-11-music';

test('Mississippi ambience and battle loop selection match the APK region route', () => {
  assert.equal(mississippi11AmbientMusic, 'music_atmo_forest');
  assert.deepEqual(mississippi11BattleMusicLoops, [
    'music_loop2_mississippi', 'music_loop2', 'music_loop3',
  ]);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map(mississippi11BattleMusicForWave),
    ['music_loop2_mississippi', 'music_loop2', 'music_loop3', 'music_loop2_mississippi', 'music_loop2', 'music_loop3'],
  );
});

test('rejects invalid Mississippi wave indices and bundles both researched music files', async () => {
  for (const wave of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => mississippi11BattleMusicForWave(wave), RangeError);
  }
  for (const filename of ['music_atmo_forest.ogg', 'music_loop2_mississippi.ogg']) {
    const bytes = await readFile(new URL(`../public/assets/music/${filename}`, import.meta.url));
    assert.ok(bytes.byteLength > 4, `${filename} is not empty`);
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${filename} has an Ogg container header`);
  }
});
