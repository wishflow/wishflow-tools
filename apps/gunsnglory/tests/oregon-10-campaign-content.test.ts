import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { oregon10CampaignCopy, oregon10CampaignCopyResources } from '../src/content/oregon-10-campaign-copy';
import { oregon10CampaignId } from '../src/content/oregon-10-identity';
import { oregon10CampaignPortraitAssets, oregon10WaveIntros } from '../src/content/oregon-10-wave-intros';
import { createOregon10CampaignContent } from '../src/content/oregon-10-campaign';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

test('Lumber Mill Hills preserves APK identity and campaign copy resources', () => {
  assert.equal(oregon10CampaignId, 'campaign-oregon-10');
  assert.deepEqual(oregon10CampaignCopyResources, {
    title: 'T_LEVEL_NAME_33',
    overview: 'T_LEVEL_INFO_33',
  });
  assert.deepEqual(oregon10CampaignCopy.title, { en: 'Lumber Mill Hills', zh: '木材厂山岭' });
  assert.deepEqual(oregon10CampaignCopy.overview, {
    en: 'The sawmills of Lumber Mill Hills destroy nature and forests in a beautiful manner.',
    zh: '木材厂山岭的锯木厂以“美妙”的方式摧毁自然与森林。',
  });
});

test('Lumber Mill Hills preserves all ten APK dialogue resources, English strings, speakers, and portraits', () => {
  assert.deepEqual(oregon10WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber,
    dialogueResource,
    speaker.en,
    portraitAsset,
    text.en,
  ]), [
    [1, 'T_CAMPAIGN_30_01', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', '"Boys, it\'s wonderful that you cut down all those trees here! Finally, I can see!"'],
    [2, 'T_CAMPAIGN_30_02', 'Gunslinger', 'portrait_gunslinger', 'Ouch! You hit my backside, Pa!'],
    [3, 'T_CAMPAIGN_30_03', 'Engineer', 'portrait_engineer', '"I see some travelers in the south! Let\'s advertise our railway line!"'],
    [4, 'T_CAMPAIGN_30_04', 'Deserter', 'portrait_deserter', 'Sir, should we continue shooting at trees or can we start aiming at the settlers?'],
    [5, 'T_CAMPAIGN_30_05', 'Mexican', 'portrait_mexican', 'Ayayay, I see gringos in the northern valley! Send us some troops!'],
    [6, 'T_CAMPAIGN_30_06', 'Indian', 'portrait_indian', '"You won\'t take our wood!"'],
    [7, 'T_CAMPAIGN_30_07', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'Take cover behind the tree stumps!'],
    [8, 'T_CAMPAIGN_30_08', 'Gunslinger', 'portrait_gunslinger', 'Cover? What for, Pa? Do you want to shoot at us or at the defenseless settlers in both valleys?'],
    [9, 'T_CAMPAIGN_30_09', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', '"I just want you to train bushwhacking! Otherwise, the settlers might not rush so blindly through the valleys again!"'],
    [10, 'T_CAMPAIGN_30_10', 'Oregon Boss', 'oregon_dakota_portrait_boss', 'Those damned savages! We should spread out and pass that valley quickly!'],
  ]);
  assert.deepEqual(oregon10WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(oregon10WaveIntros.every(({ text, speaker, voiceSound }) =>
    text.en.trim().length > 0 && text.zh.trim().length > 0 && speaker.zh.trim().length > 0 && voiceSound === undefined));
  assert.deepEqual(oregon10CampaignPortraitAssets, [
    'oregon_dakota_portrait_geezer',
    'portrait_gunslinger',
    'portrait_engineer',
    'portrait_deserter',
    'portrait_mexican',
    'portrait_indian',
    'oregon_dakota_portrait_boss',
  ]);
});

test('Lumber Mill Hills portraits are bundled offline', () => {
  for (const portrait of oregon10CampaignPortraitAssets) {
    const imagePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.equal(existsSync(imagePath), true, `${portrait} is bundled`);
    assert.equal(readFileSync(imagePath).toString('ascii', 1, 4), 'PNG');
  }
});

test('Lumber Mill Hills scene and dialogue images are included in startup preloading', () => {
  const mainSource = readFileSync(path.join(appRoot, 'src/main.ts'), 'utf8');
  assert.match(mainSource, /import \{ oregon10CampaignPortraitAssets, oregon10WaveIntros \} from '\.\/content\/oregon-10-wave-intros';/);
  assert.match(mainSource, /\.\.\.oregon10CampaignPortraitAssets,/);
  assert.match(mainSource, /createOregon10CampaignContent\(\[\.\.\.allMississippiUnitUnlocks, 'campaign-mississippi-10'\]\),/);
  assert.match(mainSource, /if \(scenarioId === oregon10CampaignId\) return oregon10WaveIntros;/);

  const scenario = createOregon10CampaignContent([
    'campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10', 'campaign-mississippi-10',
  ]);
  const preloadedAssets = new Set(collectScenarioImageAssetNames([scenario]));
  const sceneAssets = [
    ...scenario.map.background.map(({ asset }) => asset),
    ...scenario.map.streets.map(({ asset }) => asset),
    ...(scenario.map.decorations ?? []).map(({ asset }) => asset),
    ...scenario.units.flatMap(({ asset, awakeAsset, positionAssetSequence }) => [
      asset, ...(awakeAsset ? [awakeAsset] : []), ...(positionAssetSequence?.assets ?? []),
    ]),
  ];
  assert.ok(sceneAssets.every((asset) => preloadedAssets.has(asset)), 'all map, decoration, and unit images are collected');
  for (const asset of [...preloadedAssets, ...oregon10CampaignPortraitAssets]) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `${asset} is bundled`);
  }
});
