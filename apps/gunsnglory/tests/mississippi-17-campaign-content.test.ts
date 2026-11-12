import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { mississippi17CampaignCopy } from '../src/content/mississippi-17-campaign-copy';
import { mississippi17WaveIntros } from '../src/content/mississippi-17-wave-intros';
import { mississippiBattleMusicForWave, mississippiBattleMusicLoops } from '../src/content/mississippi-music';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Dead Rocks campaign copy preserves APK English and supplies Chinese translations', () => {
  assert.deepEqual(mississippi17CampaignCopy, {
    title: { en: 'Dead Rocks', zh: '死亡岩地' },
    overview: {
      en: 'There are lots of spooky night-time stories about Dead Rocks, none of which are true, of course.',
      zh: '关于死亡岩地流传着许多阴森的夜间传说——当然，没有一个是真的。',
    },
    victoryTitle: { en: 'The Dread of Dead Rocks', zh: '死亡岩地之怖' },
  });
  assert.deepEqual(mississippi17WaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]), [
    [1, 'T_CAMPAIGN_18_01'], [2, 'T_CAMPAIGN_18_02'], [3, 'T_CAMPAIGN_18_03'], [4, 'T_CAMPAIGN_18_04'],
    [5, 'T_CAMPAIGN_18_05'], [6, 'T_CAMPAIGN_18_06'], [7, 'T_CAMPAIGN_18_07'], [8, 'T_CAMPAIGN_18_08'],
  ]);
  assert.deepEqual(mississippi17WaveIntros.map(({ text }) => text.en), [
    "It's so creepy here... hold me tight, honey, so we don't lose each other!",
    "We'll really have to keep our eyes peeled here! I can't tell the settlers from the corpses!",
    'Boss... where are you? I think I\'m lost!',
    'We have to go left up here... no, right... or is it straight ahead?',
    "Señor... I... am really... out of breath... from so much running around! But that should be enough to knock 'em down!",
    'Honey, are you sure we have to stay here for a while?',
    "Hmm, I was using this stone as a landmark... I didn't realize there are lots of stones here!",
    'Boss, everything is spinning around! We should rob the last settlers fast and get outta here!',
  ]);
  assert.ok(mississippi17WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
  assert.deepEqual(mississippi17WaveIntros.map(({ portraitAsset, voiceSound }) => [portraitAsset, voiceSound]), [
    ['portrait_settlers', 'sound_siedler'], ['portrait_gunslinger', 'sound_desperado_yihaa'],
    ['portrait_mexican', 'sound_mexican_arriba'], ['portrait_settlers', 'sound_siedler'],
    ['portrait_pedro', 'sound_pedro'], ['portrait_settlers', 'sound_siedler'],
    ['portrait_settlers', 'sound_siedler'], ['portrait_mexican', 'sound_mexican_arriba'],
  ]);
});

test('Dead Rocks menu, dialogue and Mississippi music assets are bundled for offline use', () => {
  const levelImage = path.join(appRoot, 'public/assets/menu/gng_levelmap_20.png');
  assert.ok(existsSync(levelImage));
  assert.equal(readFileSync(levelImage).toString('ascii', 1, 4), 'PNG');

  for (const portrait of new Set(mississippi17WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const filePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.ok(existsSync(filePath), `${portrait} portrait is available offline`);
    assert.equal(readFileSync(filePath).toString('ascii', 1, 4), 'PNG');
  }
  for (const voice of new Set(mississippi17WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    const filePath = path.join(appRoot, 'public/assets/sounds', `${voice}.ogg`);
    assert.ok(existsSync(filePath), `${voice} audio is available offline`);
    assert.equal(readFileSync(filePath).toString('ascii', 0, 4), 'OggS');
  }

  assert.deepEqual(mississippiBattleMusicLoops, ['music_loop2_mississippi', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => mississippiBattleMusicForWave(index)), [
    'music_loop2_mississippi', 'music_loop2', 'music_loop3', 'music_loop2_mississippi',
    'music_loop2', 'music_loop3', 'music_loop2_mississippi', 'music_loop2',
  ]);
});
