import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { mississippiAmbientMusic, mississippiBattleMusicForWave, mississippiBattleMusicLoops } from '../src/content/mississippi-music';

test('Mississippi levels share the APK ambient track and wave-indexed battle loop sequence', () => {
  assert.equal(mississippiAmbientMusic, 'music_atmo_forest');
  assert.deepEqual(mississippiBattleMusicLoops, [
    'music_loop2_mississippi', 'music_loop2', 'music_loop3',
  ]);
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map(mississippiBattleMusicForWave),
    ['music_loop2_mississippi', 'music_loop2', 'music_loop3', 'music_loop2_mississippi',
      'music_loop2', 'music_loop3', 'music_loop2_mississippi'],
  );
});

test('rejects invalid Mississippi wave indices and bundles the region music offline', async () => {
  for (const wave of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => mississippiBattleMusicForWave(wave), RangeError);
  }
  for (const filename of ['music_atmo_forest.ogg', 'music_loop2_mississippi.ogg', 'music_loop2.ogg', 'music_loop3.ogg']) {
    const bytes = await readFile(new URL(`../public/assets/music/${filename}`, import.meta.url));
    assert.ok(bytes.byteLength > 4, `${filename} is not empty`);
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${filename} has an Ogg container header`);
  }
});
