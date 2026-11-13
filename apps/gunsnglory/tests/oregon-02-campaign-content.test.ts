import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { oregon01AmbientMusic, oregon01BattleMusicLoops } from '../src/content/oregon-01-music';
import { createOregon02MapScene } from '../src/content/oregon-02-scene';
import { oregon02CampaignCopy, oregon02CampaignCopyResources } from '../src/content/oregon-02-campaign-copy';
import { oregon02WaveIntros } from '../src/content/oregon-02-wave-intros';
import { gameAssetLogicalSize, gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

function pngDimensions(filePath: string): { width: number; height: number } {
  const bytes = readFileSync(filePath);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('Cashcow title and overview follow the APK map-25 string resources', () => {
  assert.deepEqual(oregon02CampaignCopyResources, {
    title: 'T_LEVEL_NAME_25',
    overview: 'T_LEVEL_INFO_25',
  });
  assert.deepEqual(oregon02CampaignCopy.title, { en: 'Cashcow Canyon', zh: '金牛峡谷' });
  assert.deepEqual(oregon02CampaignCopy.overview, {
    en: 'The sun reaches its highest spot above this beautiful valley at noon.',
    zh: '正午时，太阳升到这片美丽山谷的最高处。',
  });
  assert.equal('victoryTitle' in oregon02CampaignCopy, false);
});

test('Cashcow wave intros match all nine APK dialogue IDs, English strings, and portraits', () => {
  assert.deepEqual(oregon02WaveIntros.map((intro) => ({
    wave: intro.waveNumber,
    resource: intro.dialogueResource,
    portrait: intro.portraitAsset,
    text: intro.text.en,
  })), [
    { wave: 1, resource: 'T_CAMPAIGN_22_01', portrait: 'portrait_gunslinger', text: 'The greener the grass, the more golden the gold! And I love gold! Yeehaaaah!' },
    { wave: 2, resource: 'T_CAMPAIGN_22_02', portrait: 'portrait_settlers', text: 'Honey, I love this place. Why don\'t we just settle here?' },
    { wave: 3, resource: 'T_CAMPAIGN_22_03', portrait: 'portrait_settlers', text: 'Darling, the whole area belongs to that smelly, old cattle baron who\'s following us… I\'m glad he\'s walking in the back of our group!' },
    { wave: 4, resource: 'T_CAMPAIGN_22_04', portrait: 'portrait_pedro', text: 'Boss, they\'re all coming to us! Let\'s welcome them!' },
    { wave: 5, resource: 'T_CAMPAIGN_22_05', portrait: 'oregon_dakota_portrait_geezer', text: 'Now that reminds me of the old days! Back when I was young!' },
    { wave: 6, resource: 'T_CAMPAIGN_22_06', portrait: 'portrait_mexican', text: 'When you were young? There weren\'t even any settlers back then, old man!' },
    { wave: 7, resource: 'T_CAMPAIGN_22_07', portrait: 'portrait_gunslinger', text: 'I\'ll buy a red horse with all that gold! Newly imported from Italy!' },
    { wave: 8, resource: 'T_CAMPAIGN_22_08', portrait: 'oregon_dakota_portrait_boss', text: 'Can\'t you walk faster? I don\'t like it when someone tramps down my grass! You better not be here anymore when I catch up with you in a few minutes!' },
    { wave: 9, resource: 'T_CAMPAIGN_22_09', portrait: 'oregon_dakota_portrait_boss', text: 'What\'s going on here? Bandits? I don\'t wanna see any settlers or scoundrels here! I\'m going to report this to the Sheriff!' },
  ]);
  assert.ok(oregon02WaveIntros.every(({ text }) => text.zh.trim().length > 0));
  assert.ok(oregon02WaveIntros.every((intro) => intro.voiceSound === undefined));
  for (const portrait of new Set(oregon02WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    assert.ok(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait))), `${portrait} is bundled`);
  }
});

test('Cashcow Oregon decorations use the original APK hdpi PNGs at mdpi logical size', () => {
  const expected = {
    e_1x1_tree_green_a: { width: 48, height: 78, logical: { width: 32, height: 52 } },
    e_1x1_tree_green_b: { width: 48, height: 84, logical: { width: 32, height: 56 } },
    e_1x1_tree_stump: { width: 48, height: 48, logical: { width: 32, height: 32 } },
    e_1x1_tree_green_c: { width: 48, height: 84, logical: { width: 32, height: 56 } },
    b_1x1_watertower: { width: 48, height: 84, logical: { width: 32, height: 56 } },
    tiles_railway_buffers_verti_up: { width: 48, height: 48, logical: { width: 32, height: 32 } },
    tiles_railway_buffers_verti_down: { width: 48, height: 48, logical: { width: 32, height: 32 } },
  } as const;

  for (const [asset, dimensions] of Object.entries(expected)) {
    const assetPath = gameAssetRelativePath(asset);
    assert.equal(assetPath, `hdpi/${asset}.png`);
    const sourceSize = pngDimensions(path.join(appRoot, 'public/assets', assetPath));
    assert.deepEqual(sourceSize, { width: dimensions.width, height: dimensions.height }, asset);
    assert.deepEqual(gameAssetLogicalSize(asset, sourceSize), dimensions.logical, asset);
  }

  const sceneAssets = new Set((createOregon02MapScene().decorations ?? []).map(({ asset }) => asset));
  for (const asset of ['e_1x1_tree_green_a', 'e_1x1_tree_green_b', 'e_1x1_tree_stump', 'e_1x1_tree_green_c']) {
    assert.ok(sceneAssets.has(asset), `${asset} is placed in Cashcow Canyon`);
  }
});

test('Cashcow Canyon reuses Oregon music without adding unverified audio', () => {
  for (const track of [oregon01AmbientMusic, ...oregon01BattleMusicLoops]) {
    assert.ok(existsSync(path.join(appRoot, `public/assets/music/${track}.ogg`)), `${track} is bundled`);
  }
});
