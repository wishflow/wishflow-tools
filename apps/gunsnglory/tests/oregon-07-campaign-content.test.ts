import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { oregon07CampaignCopy, oregon07CampaignCopyResources } from '../src/content/oregon-07-campaign-copy';
import { oregon07CampaignId } from '../src/content/oregon-07-identity';
import { oregon07CampaignPortraitAssets, oregon07WaveIntros } from '../src/content/oregon-07-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const expectedWaveContent = [
  ['T_CAMPAIGN_27_01', 'Dynamite', 'oregon_dakota_portrait_dynamite', 'Hey, Boss, we buried a lot of dynamite again, at the base of Mount Hood!'],
  ['T_CAMPAIGN_27_02', 'Indian', 'portrait_indian', 'That Wy\'east! When we are no more, all culture is buried, too!'],
  ['T_CAMPAIGN_27_03', 'Engineer', 'portrait_engineer', 'My train is never late, settlers! Come on, get on board, I\'ll show you the area… From below!'],
  ['T_CAMPAIGN_27_04', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'I hear something whistling, maybe my tea is done?'],
  ['T_CAMPAIGN_27_05', 'Gunslinger', 'portrait_gunslinger', 'Pa, that\'s the Oregon Express! Maybe you should look for the sleeping car!'],
  ['T_CAMPAIGN_27_06', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', 'What? You wanna sleep? Bah, I\'ll take care of those lazy walkers!'],
  ['T_CAMPAIGN_27_07', 'Mexican', 'portrait_mexican', 'Ay, caramba! Here come some gringos from the north-east!'],
  ['T_CAMPAIGN_27_08', 'Engineer', 'portrait_engineer', 'The settlers must be cold here in the mountains! Get the Gatling guns and warm them up!'],
  ['T_CAMPAIGN_27_09', 'Pedro', 'portrait_pedro', 'Wow, here come so many settlers, we won\'t be able to carry all that gold!'],
  ['T_CAMPAIGN_27_10', 'Oregon Boss', 'oregon_dakota_portrait_boss', 'I\'m sure you robbed enough for today, just let me pass! I\'ll even offer you a piece of copper!'],
] as const;

test('Mount Hood stable identity and bilingual copy preserve APK resource IDs and English', () => {
  assert.equal(oregon07CampaignId, 'campaign-oregon-07');
  assert.deepEqual(oregon07CampaignCopyResources, {
    title: 'T_LEVEL_NAME_30',
    overview: 'T_LEVEL_INFO_30',
  });
  assert.deepEqual(oregon07CampaignCopy.title, { en: 'Mount Hood', zh: '胡德山' });
  assert.equal(oregon07CampaignCopy.overview.en,
    'The cold summits of Mount Hood offer perfect walking routes for mountain air enthusiasts.');
  assert.ok(oregon07CampaignCopy.overview.zh.length > 0);
});

test('Mount Hood preserves all ten APK dialogue strings, resource IDs, speakers, portraits, and order', () => {
  assert.deepEqual(oregon07WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
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
  assert.deepEqual(oregon07WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(oregon07WaveIntros.every(({ text, voiceSound }) => text.zh.length > 0 && voiceSound === undefined),
    'Chinese copy is supplied without inferring original voice clips');
});

test('Mount Hood portraits, level preview, trains, Oregon music, and shared sounds resolve offline', () => {
  const assetPath = (filename: string) => path.join(appRoot, 'public/assets', filename);
  const portraits = [
    ['oregon_dakota_portrait_dynamite', 96, 96],
    ['portrait_indian', 96, 96],
    ['portrait_engineer', 96, 96],
    ['oregon_dakota_portrait_geezer', 96, 96],
    ['portrait_gunslinger', 96, 96],
    ['portrait_mexican', 96, 96],
    ['portrait_pedro', 96, 110],
    ['oregon_dakota_portrait_boss', 96, 110],
  ] as const;
  assert.deepEqual(oregon07CampaignPortraitAssets, portraits.map(([name]) => name));
  for (const [portrait, width, height] of portraits) {
    const imagePath = assetPath(`${portrait}.png`);
    assert.equal(existsSync(imagePath), true, `${portrait} is included by the game-start preload`);
    const image = readFileSync(imagePath);
    assert.equal(image.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [width, height]);
  }

  const preview = readFileSync(assetPath('menu/gng_levelmap_30.png'));
  assert.deepEqual([preview.readUInt32BE(16), preview.readUInt32BE(20)], [91, 84]);
  for (const assetName of ['lok_hori_1of2', 'lok_hori_2of2', 'lok_wagon_hori', 'sfx_lok_steam']) {
    assert.equal(existsSync(assetPath(gameAssetRelativePath(assetName))), true,
      `${assetName} resolves through the existing game asset mapping`);
  }
  for (const filename of ['music/music_oregon.ogg', 'sounds/sound_train.ogg', 'sounds/sound_dynamite.ogg']) {
    const file = readFileSync(assetPath(filename));
    assert.equal(file.toString('ascii', 0, 4), 'OggS', `${filename} is an offline Ogg asset`);
  }
});
