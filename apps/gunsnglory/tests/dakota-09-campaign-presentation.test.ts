import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  dakota09AmbientMusic,
  dakota09BattleMusicForWave,
  dakota09BattleMusicLoops,
} from '../src/content/dakota-09-music';
import { dakota09CampaignCopy, dakota09CampaignCopyResources } from '../src/content/dakota-09-campaign-copy';
import { dakota09CampaignPortraitAssets, dakota09WaveIntros } from '../src/content/dakota-09-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const expectedWaveContent = [
  ['T_CAMPAIGN_39_01', 'Dakota Geezer', 'oregon_dakota_portrait_geezer', '"I just don\'t get it, is it Christmas day? Snow, trees and I see some elves up ahead!"'],
  ['T_CAMPAIGN_39_02', 'Gunslinger', 'portrait_gunslinger', '"Those aren\'t elves, old man! But you\'re right, they do have some presents with them!"'],
  ['T_CAMPAIGN_39_03', 'Calamity', 'oregon_dakota_portrait_calamity', 'The only thing that has to do anything to do with Christmas here is your snowbound mind!'],
  ['T_CAMPAIGN_39_04', 'Pedro', 'portrait_pedro', 'Why are you always so uptight, señorita? You remind me of the story about that green grouch…'],
  ['T_CAMPAIGN_39_05', 'Indian', 'portrait_indian', 'Why are palefaces always babbling? My tribe prefers to deal with more important things, like the palefaces in the west!'],
  ['T_CAMPAIGN_39_06', 'Settlers', 'portrait_settlers', '"Honey, don\'t you think it looks very festive here? Look, there\'s even a Christmas star flying towards us…"'],
  ['T_CAMPAIGN_39_07', 'Gunslinger', 'portrait_gunslinger', 'Here comes Santa Claus with his wagons full of presents!'],
  ['T_CAMPAIGN_39_08', 'Dakota Boss', 'oregon_dakota_portrait_boss', '"Eh… Hohoho, let me pass, I\'m… Santa Claus! You have to believe me!"'],
] as const;

test('Snow Town preserves APK title, overview, wave text resources, speaker portraits and English strings', () => {
  assert.deepEqual(dakota09CampaignCopyResources, {
    title: 'T_LEVEL_NAME_42',
    overview: 'T_LEVEL_INFO_42',
  });
  assert.deepEqual(dakota09CampaignCopy.title, { en: 'Snow Town', zh: '雪镇' });
  assert.deepEqual(dakota09CampaignCopy.overview, {
    en: 'The snowbound streets of Snow Town can be admired on many postcards.',
    zh: '白雪覆盖的雪镇街道，常出现在明信片上。',
  });
  assert.deepEqual(dakota09WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber, dialogueResource, speaker.en, portraitAsset, text.en,
  ]), expectedWaveContent.map(([resource, speaker, portrait, text], index) => [index + 1, resource, speaker, portrait, text]));
  assert.ok(dakota09WaveIntros.every(({ text, voiceSound }) => text.zh.trim().length > 0 && voiceSound === undefined));
  assert.deepEqual(dakota09CampaignPortraitAssets, [
    'oregon_dakota_portrait_geezer',
    'portrait_gunslinger',
    'oregon_dakota_portrait_calamity',
    'portrait_pedro',
    'portrait_indian',
    'portrait_settlers',
    'oregon_dakota_portrait_boss',
  ]);

  for (const portrait of dakota09CampaignPortraitAssets) {
    const file = fileURLToPath(new URL(`../public/assets/${gameAssetRelativePath(portrait)}`, import.meta.url));
    assert.ok(existsSync(file), `${portrait} resolves to an offline bundled portrait`);
  }
});

test('Snow Town uses the Dakota ambient and battle music rotation without playing audio', () => {
  assert.equal(dakota09AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota09BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 8 }, (_, waveIndex) => dakota09BattleMusicForWave(waveIndex)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota',
    'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
  ]);
  assert.throws(() => dakota09BattleMusicForWave(-1), RangeError);
  assert.throws(() => dakota09BattleMusicForWave(1.5), RangeError);

  for (const track of [dakota09AmbientMusic, ...dakota09BattleMusicLoops]) {
    const file = fileURLToPath(new URL(`../public/assets/music/${track}.ogg`, import.meta.url));
    const bytes = readFileSync(file);
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg`);
  }
});

test('Snow Town portraits and music are wired into the existing presentation preload and routing', () => {
  const mainSource = readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf8');
  assert.match(mainSource, /import \{ dakota09CampaignPortraitAssets \} from '\.\/content\/dakota-09-wave-intros';/);
  assert.match(mainSource, /\.\.\.dakota09CampaignPortraitAssets,/);
  assert.match(mainSource, /createDakota08CampaignContent\(allMississippiUnitUnlocks\),\s*createDakota09CampaignContent\(allMississippiUnitUnlocks\),/);
  assert.match(mainSource, /dakota09AmbientMusic/);
  assert.match(mainSource, /dakota09BattleMusicForWave/);
});
