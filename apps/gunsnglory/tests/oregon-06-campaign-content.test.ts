import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { oregon06CampaignCopy, oregon06CampaignCopyResources } from '../src/content/oregon-06-campaign-copy';
import { oregon06CampaignId } from '../src/content/oregon-06-identity';
import { oregon06CampaignPortraitAssets, oregon06WaveIntros } from '../src/content/oregon-06-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const expectedWaveContent = [
  ['T_CAMPAIGN_26_01', 'Captain', 'portrait_captain', "God bless ya, sailors! It's been quite a while! Let's see if the waters of the Columbia River are as wet as the Mississippi!"],
  ['T_CAMPAIGN_26_02', 'Indian', 'portrait_indian', 'This is our river and our salmon! Palefaces should go fishing elsewhere!'],
  ['T_CAMPAIGN_26_03', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'Isn\'t it possible to enjoy a rheumatism bath in peace?'],
  ['T_CAMPAIGN_26_04', 'Deserter', 'portrait_deserter', 'Sir, reporting enemy contact in the south-east!'],
  ['T_CAMPAIGN_26_05', 'Pedro', 'portrait_pedro', 'Boss, here come some wagons from the Californian Gold Exhibition!'],
  ['T_CAMPAIGN_26_06', 'Captain', 'portrait_captain', 'Landlubbers ahead! A golden coating of dust is approaching from the north!'],
  ['T_CAMPAIGN_26_07', 'Gunslinger', 'portrait_gunslinger', 'Get me more ammunition! Yeeehah!'],
  ['T_CAMPAIGN_26_08', 'Oregon Boss', 'oregon_dakota_portrait_boss', 'Come here, you bandit scum! I\'ll remember your faces in mind and haul all of you into court!'],
] as const;

test('Columbia River identity and bilingual copy preserve the APK resource mapping', () => {
  assert.equal(oregon06CampaignId, 'campaign-oregon-06');
  assert.deepEqual(oregon06CampaignCopyResources, {
    title: 'T_LEVEL_NAME_29',
    overview: 'T_LEVEL_INFO_29',
  });
  assert.deepEqual(oregon06CampaignCopy.title, { en: 'Columbia River', zh: '哥伦比亚河' });
  assert.equal(oregon06CampaignCopy.overview.en,
    'The salmon swarms in the Columbia River are world-renowned and easy to bait with dynamite.');
  assert.ok(oregon06CampaignCopy.overview.zh.length > 0);
});

test('Columbia River preserves all eight APK dialogue strings, resource IDs, speakers, portraits, and order', () => {
  assert.deepEqual(oregon06WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
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
  assert.deepEqual(oregon06WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(oregon06WaveIntros.every(({ text, voiceSound }) => text.zh.length > 0 && voiceSound === undefined));
});

test('Columbia River portrait, map preview, shared Oregon music, and audio assets are bundled offline', () => {
  const assetPath = (filename: string) => path.join(appRoot, 'public/assets', filename);
  const portraits = [
    ['portrait_captain', 96, 96],
    ['portrait_indian', 96, 96],
    ['oregon_dakota_portrait_geezer', 96, 96],
    ['portrait_deserter', 96, 96],
    ['portrait_pedro', 96, 110],
    ['portrait_gunslinger', 96, 96],
    ['oregon_dakota_portrait_boss', 96, 110],
  ] as const;
  assert.deepEqual(oregon06CampaignPortraitAssets, portraits.map(([name]) => name));
  for (const [portrait, width, height] of portraits) {
    const imagePath = assetPath(`${portrait}.png`);
    assert.equal(existsSync(imagePath), true, `${portrait} is included by the game-start preload`);
    const image = readFileSync(imagePath);
    assert.equal(image.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [width, height]);
  }

  const previewPath = assetPath('menu/gng_levelmap_29.png');
  assert.equal(existsSync(previewPath), true, 'map 29 overview art resolves through the campaign menu asset path');
  const preview = readFileSync(previewPath);
  assert.deepEqual([preview.readUInt32BE(16), preview.readUInt32BE(20)], [91, 84]);

  const musicPath = assetPath('music/music_oregon.ogg');
  assert.equal(existsSync(musicPath), true, 'shared Oregon battle music is bundled offline');
  assert.equal(readFileSync(musicPath).toString('ascii', 0, 4), 'OggS');
  for (const assetName of [
    'miss_tiles_waterside', 'tiles_water', 'tiles_waterside', 'tiles_bridge_hori',
    'tiles_bridge_verti', 'b_3x2_fort', 'b_3x2_saloon', 'b_2x1_tipi', 'sfx_explosion',
  ]) {
    const relativePath = gameAssetRelativePath(assetName);
    assert.equal(existsSync(assetPath(relativePath)), true, `${relativePath} resolves through the game asset loader`);
  }
  const explosionSoundPath = assetPath('sounds/sound_explosion.ogg');
  assert.equal(existsSync(explosionSoundPath), true, 'shared explosion audio is bundled without requiring playback');
  assert.equal(readFileSync(explosionSoundPath).toString('ascii', 0, 4), 'OggS');
});
