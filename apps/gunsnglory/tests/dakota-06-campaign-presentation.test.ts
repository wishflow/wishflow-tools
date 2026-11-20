import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  dakota06AmbientMusic,
  dakota06BattleMusicForWave,
  dakota06BattleMusicLoops,
} from '../src/content/dakota-06-music';
import { dakota06CampaignPortraitAssets, dakota06WaveIntros } from '../src/content/dakota-06-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const expectedWaveContent = [
  ['T_CAMPAIGN_36_01', 'Mexican', 'portrait_mexican', '“Brrrr, it\'s very cold here, Boss. Isn\'t there a winter coat upgrade?”'],
  ['T_CAMPAIGN_36_02', 'Calamity', 'oregon_dakota_portrait_calamity', '“Don\'t make such a fuss! I don\'t see why you all have to be such wusses! ”'],
  ['T_CAMPAIGN_36_03', 'Gunslinger', 'portrait_gunslinger', 'Not everybody is as cold-blooded as you are, kid!'],
  ['T_CAMPAIGN_36_04', 'Calamity', 'oregon_dakota_portrait_calamity', '“If you want me to warm you up, just keep on like that. I\'ve already got you in my sights!”'],
  ['T_CAMPAIGN_36_05', 'Pedro', 'portrait_pedro', '“Kids, you sound like you\'re married! You better aim your weapons at those settlers!”'],
  ['T_CAMPAIGN_36_06', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', '“Hey, you there in the north-east! Are you settlers? Don\'t be scared, I\'m just asking!”'],
  ['T_CAMPAIGN_36_07', 'Settlers', 'portrait_settlers', 'Look, honey, over there! That old man is waving with a scattergun!'],
  ['T_CAMPAIGN_36_08', 'Indian', 'portrait_indian', '“The white men\'s gold is on the way! My preciousss!”'],
  ['T_CAMPAIGN_36_09', 'Dakota Boss', 'oregon_dakota_portrait_boss', '“You\'ll never get my gold, you scoundrels! Only over my dead body!”'],
] as const;

test('Ice Rocks preserves APK dialogue resource identity, English text, speaker, portrait and wave order', () => {
  assert.deepEqual(dakota06WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
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
  assert.ok(dakota06WaveIntros.every(({ text, voiceSound }) => text.zh.trim().length > 0 && voiceSound === undefined));
  assert.deepEqual(dakota06CampaignPortraitAssets, [
    'portrait_mexican',
    'oregon_dakota_portrait_calamity',
    'portrait_gunslinger',
    'portrait_pedro',
    'oregon_dakota_portrait_geezer',
    'portrait_settlers',
    'portrait_indian',
    'oregon_dakota_portrait_boss',
  ]);

  for (const portrait of dakota06CampaignPortraitAssets) {
    assert.ok(existsSync(fileURLToPath(new URL(`../public/assets/${gameAssetRelativePath(portrait)}`, import.meta.url))),
      `${portrait} resolves to a bundled offline image`);
  }
});

test('Ice Rocks uses the Dakota ambient track and APK wave-indexed music rotation', () => {
  assert.equal(dakota06AmbientMusic, 'music_atmo_snow');
  assert.deepEqual(dakota06BattleMusicLoops, ['music_dakota', 'music_loop2', 'music_loop3']);
  assert.deepEqual(Array.from({ length: 9 }, (_, waveIndex) => dakota06BattleMusicForWave(waveIndex)), [
    'music_dakota', 'music_loop2', 'music_loop3', 'music_dakota', 'music_loop2',
    'music_loop3', 'music_dakota', 'music_loop2', 'music_loop3',
  ]);
  assert.throws(() => dakota06BattleMusicForWave(-1), RangeError);
  assert.throws(() => dakota06BattleMusicForWave(1.5), RangeError);

  for (const track of [dakota06AmbientMusic, ...dakota06BattleMusicLoops]) {
    const bytes = readFileSync(fileURLToPath(new URL(`../public/assets/music/${track}.ogg`, import.meta.url)));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg audio`);
  }
});

test('Ice Rocks presentation data is connected to the browser caption, HUD, dialogue, music and preload routes', () => {
  const mainSource = readFileSync(fileURLToPath(new URL('../src/main.ts', import.meta.url)), 'utf8');

  assert.match(mainSource, /\.\.\.dakota06CampaignPortraitAssets,/);
  assert.match(mainSource, /if \(scenarioId === dakota06CampaignId\) return dakota06WaveIntros;/);
  assert.match(mainSource, /officialStage\?\.scenarioId === dakota06CampaignId[\s\S]*?'达科他' : 'DAKOTA'/);
  assert.match(mainSource, /Official Ice Rocks level 36: nine original waves across three entrances/);
  assert.match(mainSource, /正式关卡：冰岩，第 36 关。包含三个入口上的原版九波/);
  assert.match(mainSource, /session\.startRecord\.scenarioId === dakota06CampaignId\s*\? dakota06BattleMusicForWave/);
  assert.match(mainSource, /session\.startRecord\.scenarioId === dakota06CampaignId\s*\? dakota06AmbientMusic/);
});
