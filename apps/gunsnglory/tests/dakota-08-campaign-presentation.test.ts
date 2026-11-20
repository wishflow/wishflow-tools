import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { dakota08AmbientMusic, dakota08BattleMusicForWave, dakota08BattleMusicLoops } from '../src/content/dakota-08-music';
import { dakota08CampaignCopy, dakota08CampaignCopyResources } from '../src/content/dakota-08-campaign-copy';
import { dakota08CampaignPortraitAssets, dakota08WaveIntros } from '../src/content/dakota-08-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const expectedWaveContent = [
  ['T_CAMPAIGN_38_01', 'Captain', 'portrait_captain', "There's a beautiful view on this rough sea! Show me some settlers and I'll make my calliopes glow!"],
  ['T_CAMPAIGN_38_02', 'Pedro', 'portrait_pedro', "You're talking about a rough sea, when your ship ran aground in a small pond?"],
  ['T_CAMPAIGN_38_03', 'Mexican', 'portrait_mexican', 'Here come some guests from the north-east! I bet they want to splash around in our pond!'],
  ['T_CAMPAIGN_38_04', 'Settlers', 'portrait_settlers', "Honey, look! There's a swimming pool ahead! Just for us!"],
  ['T_CAMPAIGN_38_05', 'Dakota Geezer', 'oregon_dakota_portrait_geezer', 'Hm, those female settlers from the west get more beautiful every day! Well, well, If I only was younger…'],
  ['T_CAMPAIGN_38_06', 'Dakota Geezer', 'oregon_dakota_portrait_geezer', "When you still were young, Pa, the grandmothers of those settlers weren't even born!"],
  ['T_CAMPAIGN_38_07', 'Gunslinger', 'portrait_gunslinger', 'Sailors, load the cannons! We have visitors from all directions!'],
  ['T_CAMPAIGN_38_08', 'Dakota Boss', 'oregon_dakota_portrait_boss', "Go on with your swim, bandits, I'll hightail out of here in the meantime!"],
] as const;

test('Wayne Waters preserves APK title, overview, dialogue resources, English text and portraits', () => {
  assert.deepEqual(dakota08CampaignCopyResources, {
    title: 'T_LEVEL_NAME_41',
    overview: 'T_LEVEL_INFO_41',
  });
  assert.deepEqual(dakota08CampaignCopy.title, { en: 'Wayne Waters', zh: '韦恩水域' });
  assert.deepEqual(dakota08CampaignCopy.overview, {
    en: 'The swimming lake of Wayne Waters is perfect for splashing and diving for gold.',
    zh: '韦恩水域的湖泊很适合戏水，也很适合潜水淘金。',
  });
  assert.deepEqual(dakota08WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber, dialogueResource, speaker.en, portraitAsset, text.en,
  ]), expectedWaveContent.map(([resource, speaker, portrait, text], index) => [index + 1, resource, speaker, portrait, text]));
  assert.ok(dakota08WaveIntros.every(({ text, voiceSound }) => text.zh.trim().length > 0 && voiceSound === undefined));
  assert.deepEqual(dakota08CampaignPortraitAssets, [
    'portrait_captain',
    'portrait_pedro',
    'portrait_mexican',
    'portrait_settlers',
    'oregon_dakota_portrait_geezer',
    'portrait_gunslinger',
    'oregon_dakota_portrait_boss',
  ]);

  for (const portrait of dakota08CampaignPortraitAssets) {
    const file = fileURLToPath(new URL(`../public/assets/${gameAssetRelativePath(portrait)}`, import.meta.url));
    assert.ok(existsSync(file), `${portrait} resolves to an offline bundled portrait`);
  }
});

test('Wayne Waters uses Dakota music resources without playing audio during validation', () => {
  assert.equal(dakota08AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota08BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 8 }, (_, waveIndex) => dakota08BattleMusicForWave(waveIndex)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota',
    'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
  ]);
  assert.throws(() => dakota08BattleMusicForWave(-1), RangeError);
  assert.throws(() => dakota08BattleMusicForWave(1.5), RangeError);

  for (const track of [dakota08AmbientMusic, ...dakota08BattleMusicLoops]) {
    const bytes = readFileSync(fileURLToPath(new URL(`../public/assets/music/${track}.ogg`, import.meta.url)));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg`);
  }
});

test('Wayne Waters portraits are part of the app startup image preload list', () => {
  const mainSource = readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf8');
  assert.match(mainSource, /import \{ dakota08CampaignPortraitAssets \} from '\.\/content\/dakota-08-wave-intros';/);
  assert.match(mainSource, /\.\.\.dakota08CampaignPortraitAssets,/);
});
