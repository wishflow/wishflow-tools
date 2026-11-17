import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createOregon09CampaignContent } from '../src/content/oregon-09-campaign';
import { oregon09CampaignPortraitAssets, oregon09WaveIntros } from '../src/content/oregon-09-wave-intros';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Snake River preserves its six APK dialogue resources, English strings, and portraits', () => {
  assert.deepEqual(oregon09WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber,
    dialogueResource,
    speaker.en,
    portraitAsset,
    text.en,
  ]), [
    [1, 'T_CAMPAIGN_29_01', 'Dynamite', 'oregon_dakota_portrait_dynamite', 'Finally, some rest! Slow down those settlers and trigger the mines!'],
    [2, 'T_CAMPAIGN_29_02', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'Eureka! Lure them out and gather them around our dynamite presents!'],
    [3, 'T_CAMPAIGN_29_03', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', '"Presents? Is it someone\'s birthday or death day?"'],
    [4, 'T_CAMPAIGN_29_04', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', '"Who\'s dead? I thought the settlers don\'t defend themselves!"'],
    [5, 'T_CAMPAIGN_29_05', 'Captain', 'portrait_captain', '"Settlers? Where? I\'ll swab the deck with them!"'],
    [6, 'T_CAMPAIGN_29_06', 'Oregon Boss', 'oregon_dakota_portrait_boss', '"It should be easy to get through this valley! It\'s as quiet as a retirement home here!"'],
  ]);
  assert.deepEqual(oregon09WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6]);
  assert.ok(oregon09WaveIntros.every(({ text, voiceSound }) => text.zh.trim().length > 0 && voiceSound === undefined));
  assert.deepEqual(oregon09CampaignPortraitAssets, [
    'oregon_dakota_portrait_dynamite',
    'oregon_dakota_portrait_geezer',
    'portrait_captain',
    'oregon_dakota_portrait_boss',
  ]);
});

test('Snake River portraits are bundled offline and included in startup preloading', () => {
  for (const portrait of oregon09CampaignPortraitAssets) {
    const imagePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.equal(existsSync(imagePath), true, `${portrait} is bundled`);
    assert.equal(readFileSync(imagePath).toString('ascii', 1, 4), 'PNG');
  }

  const mainSource = readFileSync(path.join(appRoot, 'src/main.ts'), 'utf8');
  assert.match(mainSource, /import \{ oregon09CampaignPortraitAssets, oregon09WaveIntros \} from '\.\/content\/oregon-09-wave-intros';/);
  assert.match(mainSource, /\.\.\.oregon09CampaignPortraitAssets,/);
  assert.match(mainSource, /createOregon09CampaignContent\(\[\.\.\.allMississippiUnitUnlocks, 'campaign-mississippi-10'\]\),/,
    'the complete Snake River map content feeds the shared startup image collector');
  assert.match(mainSource, /if \(scenarioId === oregon09CampaignId\) return oregon09WaveIntros;/);

  const allUnlocks = [
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10', 'campaign-mississippi-10',
  ];
  const scenario = createOregon09CampaignContent(allUnlocks);
  const preloadedAssets = new Set(collectScenarioImageAssetNames([scenario]));
  const sceneAssets = [
    ...scenario.map.background.map(({ asset }) => asset),
    ...scenario.map.streets.map(({ asset }) => asset),
    ...(scenario.map.decorations ?? []).map(({ asset }) => asset),
    ...scenario.units.flatMap(({ asset, awakeAsset, positionAssetSequence }) => [
      asset, ...(awakeAsset ? [awakeAsset] : []), ...(positionAssetSequence?.assets ?? []),
    ]),
  ];
  assert.ok(sceneAssets.every((asset) => preloadedAssets.has(asset)), 'all Snake River scene and unit images are collected');
  for (const asset of preloadedAssets) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `${asset} is bundled`);
  }
});
