import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { mississippi18CampaignCopy } from '../src/content/mississippi-18-campaign-copy';
import { mississippi18WaveIntros } from '../src/content/mississippi-18-wave-intros';
import { mississippiBattleMusicForWave, mississippiBattleMusicLoops } from '../src/content/mississippi-music';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Shadow Town preserves APK English copy and supplies Chinese translations for all eight waves', () => {
  assert.deepEqual(mississippi18CampaignCopy, {
    title: { en: 'Shadow Town', zh: '影镇' },
    overview: {
      en: "There's only one town where you're faster than your shadow: Shadow Town.",
      zh: '只有一座小镇，你能跑得比自己的影子还快：影镇。',
    },
    victoryTitle: { en: 'The Shadow of Shadow Town', zh: '影镇之影' },
  });
  assert.deepEqual(mississippi18WaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]), [
    [1, 'T_CAMPAIGN_17_01'], [2, 'T_CAMPAIGN_17_02'], [3, 'T_CAMPAIGN_17_03'], [4, 'T_CAMPAIGN_17_04'],
    [5, 'T_CAMPAIGN_17_05'], [6, 'T_CAMPAIGN_17_06'], [7, 'T_CAMPAIGN_17_07'], [8, 'T_CAMPAIGN_17_08'],
  ]);
  assert.deepEqual(mississippi18WaveIntros.map(({ text }) => text.en), [
    'Welcome to Shadow Town!',
    'Welcome? Are you talking to me?',
    "A town... at last! I'm sure we'll be able to rest here!",
    "More are on their way! Let's show them some hospitality!",
    'All roads lead to... Shadow Town!',
    'Boss, when I see all the settlers here, I realize we still don\'t have a cemetery!',
    'Whaddya mean, cemetery? We have two saloons; what more do you want?',
    "That's what I call a boom town! BOOM!",
  ]);
  assert.deepEqual(mississippi18WaveIntros.map(({ speaker }) => speaker.en), [
    'Pedro', 'Mexican', 'Settlers', 'Gunslinger', 'Gunslinger', 'Mexican', 'Gunslinger', 'Mexican',
  ]);
  assert.deepEqual(mississippi18WaveIntros.map(({ portraitAsset, voiceSound }) => [portraitAsset, voiceSound]), [
    ['portrait_pedro', 'sound_pedro'], ['portrait_mexican', 'sound_mexican_arriba'],
    ['portrait_settlers', 'sound_siedler'], ['portrait_gunslinger', 'sound_desperado_yihaa'],
    ['portrait_gunslinger', 'sound_desperado_yihaa'], ['portrait_mexican', 'sound_mexican_arriba'],
    ['portrait_gunslinger', 'sound_desperado_yihaa'], ['portrait_mexican', 'sound_mexican_arriba'],
  ]);
  assert.ok(mississippi18WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
});

test('Shadow Town map thumbnail, wave portraits, voice clips, and Mississippi music are bundled offline', () => {
  const levelImage = path.join(appRoot, 'public/assets/menu/gng_levelmap_21.png');
  assert.ok(existsSync(levelImage));
  assert.equal(readFileSync(levelImage).toString('ascii', 1, 4), 'PNG');

  for (const portrait of new Set(mississippi18WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const filePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.ok(existsSync(filePath), `${portrait} portrait is available offline`);
    assert.equal(readFileSync(filePath).toString('ascii', 1, 4), 'PNG');
  }
  for (const voice of new Set(mississippi18WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
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
