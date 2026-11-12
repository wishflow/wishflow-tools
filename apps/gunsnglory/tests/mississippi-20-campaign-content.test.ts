import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { mississippi20CampaignCopy } from '../src/content/mississippi-20-campaign-copy';
import { mississippi20WaveIntros } from '../src/content/mississippi-20-wave-intros';
import { mississippi20CampaignId } from '../src/content/mississippi-20-identity';
import { mississippiBattleMusicForWave, mississippiBattleMusicLoops } from '../src/content/mississippi-music';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Horse Hills preserves APK English copy and supplies translated eight-wave dialogue', () => {
  assert.equal(mississippi20CampaignId, 'campaign-mississippi-20');
  assert.deepEqual(mississippi20CampaignCopy, {
    title: { en: 'Horse Hills', zh: '马丘陵' },
    overview: {
      en: 'Every year, thrilling horse races take place in Horse Hills; the winner is awarded a golden horseshoe!',
      zh: '每年，马丘陵都会举办精彩的赛马比赛，冠军将获得一枚金马蹄铁！',
    },
    victoryTitle: { en: 'The Hunter of Horse Hills', zh: '马丘陵的猎手' },
  });
  assert.deepEqual(mississippi20WaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]), [
    [1, 'T_CAMPAIGN_20_01'], [2, 'T_CAMPAIGN_20_02'], [3, 'T_CAMPAIGN_20_03'], [4, 'T_CAMPAIGN_20_04'],
    [5, 'T_CAMPAIGN_20_05'], [6, 'T_CAMPAIGN_20_06'], [7, 'T_CAMPAIGN_20_07'], [8, 'T_CAMPAIGN_20_08'],
  ]);
  assert.deepEqual(mississippi20WaveIntros.map(({ text }) => text.en), [
    "I love horses! They're delicious!",
    "I'll put 100 Gold on the brown horse!",
    'I wish I could ride...',
    'These short cuts will be our downfall!',
    "Let's get going!",
    'Boss, if horses could talk, would they have accents, too?',
    'Woah! We have to hurry!',
    "Yes, hurry! Or you'll be too late for your funeral!",
  ]);
  assert.deepEqual(mississippi20WaveIntros.map(({ speaker }) => speaker.en), [
    'Mexican', 'Gunslinger', 'Mexican', 'Pedro', 'Captain', 'Mexican', 'Settlers', 'Gunslinger',
  ]);
  assert.deepEqual(mississippi20WaveIntros.map(({ portraitAsset, voiceSound }) => [portraitAsset, voiceSound]), [
    ['portrait_mexican', 'sound_mexican_arriba'],
    ['portrait_gunslinger', 'sound_desperado_yihaa'],
    ['portrait_mexican', 'sound_mexican_arriba'],
    ['portrait_pedro', 'sound_pedro'],
    ['portrait_captain', undefined],
    ['portrait_mexican', 'sound_mexican_arriba'],
    ['portrait_settlers', 'sound_siedler'],
    ['portrait_gunslinger', 'sound_desperado_yihaa'],
  ]);
  assert.ok(mississippi20WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
});

test('Horse Hills thumbnail, dialogue portraits, mapped voices, and Mississippi music are bundled offline', () => {
  const levelImage = path.join(appRoot, 'public/assets/menu/gng_levelmap_23.png');
  assert.ok(existsSync(levelImage));
  assert.equal(readFileSync(levelImage).toString('ascii', 1, 4), 'PNG');

  for (const portrait of new Set(mississippi20WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const filePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.ok(existsSync(filePath), `${portrait} portrait is available offline`);
    assert.equal(readFileSync(filePath).toString('ascii', 1, 4), 'PNG');
  }
  for (const voice of new Set(mississippi20WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
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
