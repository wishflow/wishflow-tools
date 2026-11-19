import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { dakota05CampaignCopy, dakota05CampaignCopyResources } from '../src/content/dakota-05-campaign-copy';
import {
  dakota05AmbientMusic,
  dakota05BattleMusicForWave,
  dakota05BattleMusicLoops,
} from '../src/content/dakota-05-music';
import { dakota05CampaignPortraitAssets, dakota05WaveIntros } from '../src/content/dakota-05-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const expectedWaveContent = [
  ['T_CAMPAIGN_35_01', 'Mexican', 'portrait_mexican', '“Boss, I\'m scared… They say that Ghost Town is haunted!”'],
  ['T_CAMPAIGN_35_02', 'Pedro', 'portrait_pedro', '“Those aren\'t ghosts, those are sleepy desperadoes, bandits and deserters! But they\'re just as ugly!”'],
  ['T_CAMPAIGN_35_03', 'Gunslinger', 'portrait_gunslinger', '“I\'m not really sure… Or is it really just chance that a new bandit enters the town for every one that gets hired.”'],
  ['T_CAMPAIGN_35_04', 'Indian', 'portrait_indian', 'These are the lost souls of our ancestors! Control them and you will control the south!'],
  ['T_CAMPAIGN_35_05', 'Pedro', 'portrait_pedro', 'It looks like some settlers actually dared to cross the streets of Ghost Town in the south! Scare them to death!'],
  ['T_CAMPAIGN_35_06', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', '“Whether it\'s ghosts or just sleepy gringos, what matters is that they all want just one thing: gold!”'],
  ['T_CAMPAIGN_35_07', 'Captain', 'portrait_captain', 'Reporting enemy movement in the north and south!'],
  ['T_CAMPAIGN_35_08', 'Indian', 'portrait_indian', 'North and south? Yes, I remember that one…'],
  ['T_CAMPAIGN_35_09', 'Dakota Boss', 'oregon_dakota_portrait_boss', 'You wanna see a ghost? Here I am! And now tremble to death… And just let me pass through, okay?'],
] as const;

test('Ghost Town bilingual title and overview retain their APK resource identity', () => {
  assert.deepEqual(dakota05CampaignCopyResources, {
    title: 'T_LEVEL_NAME_38',
    overview: 'T_LEVEL_INFO_38',
  });
  assert.deepEqual(dakota05CampaignCopy.title, { en: 'Ghost Town', zh: '幽灵镇' });
  assert.equal(dakota05CampaignCopy.overview.en,
    'In Ghost Town, settlers can get away from the noise of the bustling big city.');
  assert.ok(dakota05CampaignCopy.overview.zh.length > 0);
});

test('Ghost Town preserves the nine APK dialogue strings, speaker mapping, portrait mapping and order', () => {
  assert.deepEqual(dakota05WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber,
    dialogueResource,
    speaker.en,
    portraitAsset,
    text.en,
  ]), expectedWaveContent.map(([resource, speaker, portrait, text], index) => [
    index + 1,
    resource,
    speaker,
    portrait,
    text,
  ]));
  assert.ok(dakota05WaveIntros.every(({ text, voiceSound }) => text.zh.trim().length > 0 && voiceSound === undefined));
  assert.deepEqual(dakota05CampaignPortraitAssets, [
    'portrait_mexican',
    'portrait_pedro',
    'portrait_gunslinger',
    'portrait_indian',
    'oregon_dakota_portrait_geezer',
    'portrait_captain',
    'oregon_dakota_portrait_boss',
  ]);

  for (const portrait of dakota05CampaignPortraitAssets) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/assets/${gameAssetRelativePath(portrait)}`, import.meta.url))),
      `${portrait} resolves to a bundled offline image`);
  }
});

test('Ghost Town music maps to bundled Dakota tracks and cycles by wave index', () => {
  assert.equal(dakota05AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota05BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 10 }, (_, waveIndex) => dakota05BattleMusicForWave(waveIndex)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
    'music_loop3', 'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota',
  ]);
  assert.throws(() => dakota05BattleMusicForWave(-1), RangeError);
  assert.throws(() => dakota05BattleMusicForWave(1.5), RangeError);

  for (const track of [dakota05AmbientMusic, ...dakota05BattleMusicLoops]) {
    const bytes = readFileSync(fileURLToPath(new URL(`../public/assets/music/${track}.ogg`, import.meta.url)));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg audio`);
  }
});

test('Ghost Town presentation data is connected to the browser HUD, dialogue, music and preload consumers', () => {
  const mainSource = readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf8');
  const browserSource = readFileSync(fileURLToPath(new URL('../src/bootstrap/browser.ts', import.meta.url)), 'utf8');

  assert.match(mainSource, /\.\.\.dakota05CampaignPortraitAssets,/);
  assert.match(mainSource, /if \(scenarioId === dakota05CampaignId\) return dakota05WaveIntros;/);
  assert.match(mainSource, /session\.startRecord\.scenarioId === dakota05CampaignId\s*\? dakota05BattleMusicForWave/);
  assert.match(mainSource, /session\.startRecord\.scenarioId === dakota05CampaignId\s*\? dakota05AmbientMusic/);
  assert.match(mainSource, /createBrowserGameForDakota05Replay\(/);
  assert.match(browserSource, /createDakota05CampaignContentFromSnapshot\(parsed\.snapshot\)/);
});
