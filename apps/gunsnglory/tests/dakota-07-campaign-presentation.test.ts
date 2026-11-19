import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { dakota07AmbientMusic, dakota07BattleMusicForWave, dakota07BattleMusicLoops } from '../src/content/dakota-07-music';
import { dakota07CampaignCopy, dakota07CampaignCopyResources } from '../src/content/dakota-07-campaign-copy';
import { dakota07CampaignPortraitAssets, dakota07WaveIntros } from '../src/content/dakota-07-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const expectedWaveContent = [
  ['T_CAMPAIGN_37_01', 'Engineer', 'portrait_engineer', '“I\'m sorry for the delay, but the tracks are frozen!”'],
  ['T_CAMPAIGN_37_02', 'Gunslinger', 'portrait_gunslinger', '“Damn, your railway isn\'t longer than fifty yards! How can there be a delay?”'],
  ['T_CAMPAIGN_37_03', 'Pedro', 'portrait_pedro', 'Fortunately, I never have to go by train! There would be a hundred new settlements by the time I got there!'],
  ['T_CAMPAIGN_37_04', 'Dakota Geezer', 'oregon_dakota_portrait_geezer', 'Speaking of settlements, here comes a whole bunch of new settlers! The very thing for my scattergun!'],
  ['T_CAMPAIGN_37_05', 'Mexican', 'portrait_mexican', 'I hate to mention it, but did you see that some settlers are coming from the north-east?'],
  ['T_CAMPAIGN_37_06', 'Dakota Geezer', 'oregon_dakota_portrait_geezer', 'North-east? I only see some in the west!'],
  ['T_CAMPAIGN_37_07', 'Pedro', 'portrait_pedro', 'Settlers from the west? Are they lost? I thought they wanted to go west…'],
  ['T_CAMPAIGN_37_08', 'Dakota Boss', 'oregon_dakota_portrait_boss', '“Damn, those railroad tracks don\'t lead to the west! Looks like I\'ll have to walk…”'],
] as const;

test('Frost Station dialogue retains APK resource IDs, English copy, speakers, portrait order and Chinese translations', () => {
  assert.deepEqual(dakota07CampaignCopyResources, {
    title: 'T_LEVEL_NAME_40',
    overview: 'T_LEVEL_INFO_40',
  });
  assert.deepEqual(dakota07CampaignCopy.title, { en: 'Frost Station', zh: '霜冻车站' });
  assert.deepEqual(dakota07CampaignCopy.overview, {
    en: 'Frost Station is a famous gathering point for travelers and connects all the railroads in the area.',
    zh: '霜冻车站是旅人们熟知的集散地，连接着这一带的所有铁路。',
  });
  assert.deepEqual(dakota07WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber, dialogueResource, speaker.en, portraitAsset, text.en,
  ]), expectedWaveContent.map(([resource, speaker, portrait, text], index) => [index + 1, resource, speaker, portrait, text]));
  assert.ok(dakota07WaveIntros.every(({ text, voiceSound }) => text.zh.trim().length > 0 && voiceSound === undefined));
  assert.deepEqual(dakota07CampaignPortraitAssets, [
    'portrait_engineer',
    'portrait_gunslinger',
    'portrait_pedro',
    'oregon_dakota_portrait_geezer',
    'portrait_mexican',
    'oregon_dakota_portrait_boss',
  ]);

  for (const portrait of dakota07CampaignPortraitAssets) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/assets/${gameAssetRelativePath(portrait)}`, import.meta.url))),
      `${portrait} resolves to a bundled offline portrait`);
  }
});

test('Frost Station uses Dakota music resources without playing them during validation', () => {
  assert.equal(dakota07AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota07BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 8 }, (_, waveIndex) => dakota07BattleMusicForWave(waveIndex)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
  ]);
  assert.throws(() => dakota07BattleMusicForWave(-1), RangeError);
  assert.throws(() => dakota07BattleMusicForWave(1.5), RangeError);

  for (const track of [dakota07AmbientMusic, ...dakota07BattleMusicLoops]) {
    const bytes = readFileSync(fileURLToPath(new URL(`../public/assets/music/${track}.ogg`, import.meta.url)));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg`);
  }
});
