import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { mississippi19CampaignCopy } from '../src/content/mississippi-19-campaign-copy';
import { mississippi19WaveIntros } from '../src/content/mississippi-19-wave-intros';
import { mississippiBattleMusicForWave, mississippiBattleMusicLoops } from '../src/content/mississippi-music';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Dust Falls preserves APK English copy and translates its eight wave dialogues', () => {
  assert.deepEqual(mississippi19CampaignCopy, {
    title: { en: 'Dust Falls', zh: '尘瀑镇' },
    overview: {
      en: 'Soggy dust fills the air when you jump into the water from Dust Falls.',
      zh: '从尘瀑镇跃入水中时，潮湿的尘土弥漫在空中。',
    },
    victoryTitle: { en: 'The Strangeness of Dust Falls', zh: '尘瀑镇的奇异景象' },
  });
  assert.deepEqual(mississippi19WaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]), [
    [1, 'T_CAMPAIGN_19_01'], [2, 'T_CAMPAIGN_19_02'], [3, 'T_CAMPAIGN_19_03'], [4, 'T_CAMPAIGN_19_04'],
    [5, 'T_CAMPAIGN_19_05'], [6, 'T_CAMPAIGN_19_06'], [7, 'T_CAMPAIGN_19_07'], [8, 'T_CAMPAIGN_19_08'],
  ]);
  assert.deepEqual(mississippi19WaveIntros.map(({ text }) => text.en), [
    'The sound of the waterfall makes me want to take a leak!',
    'I wonder how deep it is here...',
    "I can't tell you how deep it is here, honey! So it must be three-dimensional!",
    'Palefaces on right! Blue Buffalo is drawing his bow!',
    'The settlers are splashing around!',
    "Boss! I can't cross the waterfall! I can't jump!",
    'The settlers are coming in droves!',
    'The waterfall should soon be covered in dust.',
  ]);
  assert.deepEqual(mississippi19WaveIntros.map(({ speaker }) => speaker.en), [
    'Mexican', 'Settlers', 'Settlers', 'Indian', 'Pedro', 'Mexican', 'Pedro', 'Gunslinger',
  ]);
  assert.deepEqual(mississippi19WaveIntros.map(({ portraitAsset, voiceSound }) => [portraitAsset, voiceSound]), [
    ['portrait_mexican', 'sound_mexican_arriba'], ['portrait_settlers', 'sound_siedler'],
    ['portrait_settlers', 'sound_siedler'], ['portrait_indian', 'sound_indian_hugh'],
    ['portrait_pedro', 'sound_pedro'], ['portrait_mexican', 'sound_mexican_arriba'],
    ['portrait_pedro', 'sound_pedro'], ['portrait_gunslinger', 'sound_desperado_yihaa'],
  ]);
  assert.ok(mississippi19WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
});

test('Dust Falls thumbnail, dialogue portraits, voice clips, and Mississippi music are bundled offline', () => {
  const levelImage = path.join(appRoot, 'public/assets/menu/gng_levelmap_22.png');
  assert.ok(existsSync(levelImage));
  assert.equal(readFileSync(levelImage).toString('ascii', 1, 4), 'PNG');

  for (const portrait of new Set(mississippi19WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const filePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.ok(existsSync(filePath), `${portrait} portrait is available offline`);
    assert.equal(readFileSync(filePath).toString('ascii', 1, 4), 'PNG');
  }
  for (const voice of new Set(mississippi19WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    const filePath = path.join(appRoot, 'public/assets/sounds', `${voice}.ogg`);
    assert.ok(existsSync(filePath), `${voice} voice clip is available offline`);
    assert.equal(readFileSync(filePath).toString('ascii', 0, 4), 'OggS');
  }

  assert.deepEqual(mississippiBattleMusicLoops, ['music_loop2_mississippi', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => mississippiBattleMusicForWave(index)), [
    'music_loop2_mississippi', 'music_loop2', 'music_loop3', 'music_loop2_mississippi',
    'music_loop2', 'music_loop3', 'music_loop2_mississippi', 'music_loop2',
  ]);
});
