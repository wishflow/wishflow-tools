import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { oregon08CampaignCopy, oregon08CampaignCopyResources } from '../src/content/oregon-08-campaign-copy';
import { oregon08CampaignPortraitAssets, oregon08WaveIntros } from '../src/content/oregon-08-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');
const expectedWaveContent = [
  ['T_CAMPAIGN_28_01', 'Gunslinger', 'portrait_gunslinger', 'Hopefully, enough settlers will come today! I have some gambling debts and I really need their gold!'],
  ['T_CAMPAIGN_28_02', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', "As I always say, don't play with gold!"],
  ['T_CAMPAIGN_28_03', 'Indian', 'portrait_indian', 'Smoke signals: White - Man - White - Woman - North-east - South-east'],
  ['T_CAMPAIGN_28_04', 'Gunslinger', 'portrait_gunslinger', "Hey, you there, settlers in the north, you don't wanna play poker, do you?"],
  ['T_CAMPAIGN_28_05', 'Settlers', 'portrait_settlers', "Did you hear that? Maybe there's a casino nearby, honey!"],
  ['T_CAMPAIGN_28_06', 'Gunslinger', 'portrait_gunslinger', "Yeah, sure, a casino! I'm the ace and you're the jack of clubs! The clubs means dead!"],
  ['T_CAMPAIGN_28_07', 'Indian', 'portrait_indian', 'Smoke signals: All - Directions - Tourists'],
  ['T_CAMPAIGN_28_08', 'Oregon Geezer', 'oregon_dakota_portrait_geezer', "I don't know if I'm seeing double or if the settlers really are overrunning the place!"],
  ['T_CAMPAIGN_28_09', 'Oregon Boss', 'oregon_dakota_portrait_boss', "Are you scared? Those aren't shots, it's a thunderstorm! Go ahead, men!"],
] as const;

test('Colt City identity and bilingual overview preserve APK resource IDs and English copy', () => {
  assert.deepEqual(oregon08CampaignCopyResources, {
    title: 'T_LEVEL_NAME_31',
    overview: 'T_LEVEL_INFO_31',
  });
  assert.deepEqual(oregon08CampaignCopy.title, { en: 'Colt City', zh: '柯尔特城' });
  assert.equal(oregon08CampaignCopy.overview.en,
    'Gambling and Colt gunplay are at the top of the agenda in Colt City.');
  assert.ok(oregon08CampaignCopy.overview.zh.length > 0);
});

test('Colt City keeps the nine APK dialogue strings, resource IDs, portraits, and sequence', () => {
  assert.deepEqual(oregon08WaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
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
  assert.deepEqual(oregon08WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.ok(oregon08WaveIntros.every(({ text, voiceSound }) => text.zh.length > 0 && voiceSound === undefined),
    'Chinese text is translated without claiming that an original voice clip exists');
  assert.deepEqual(oregon08CampaignPortraitAssets, [
    'portrait_gunslinger',
    'oregon_dakota_portrait_geezer',
    'portrait_indian',
    'portrait_settlers',
    'oregon_dakota_portrait_boss',
  ]);
});

test('Colt City portraits, map preview, and regional Oregon music are available offline', () => {
  const assetPath = (filename: string) => path.join(appRoot, 'public/assets', filename);
  const portraits = [
    ['portrait_gunslinger', 96, 96],
    ['oregon_dakota_portrait_geezer', 96, 96],
    ['portrait_indian', 96, 96],
    ['portrait_settlers', 96, 110],
    ['oregon_dakota_portrait_boss', 96, 110],
  ] as const;
  for (const [portrait, width, height] of portraits) {
    const imagePath = assetPath(gameAssetRelativePath(portrait));
    assert.equal(existsSync(imagePath), true, `${portrait} is bundled`);
    const image = readFileSync(imagePath);
    assert.equal(image.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [width, height]);
  }

  const preview = readFileSync(assetPath('menu/gng_levelmap_31.png'));
  assert.deepEqual([preview.readUInt32BE(16), preview.readUInt32BE(20)], [91, 84]);
  for (const filename of [
    'music/music_atmo_forest.ogg',
    'music/music_oregon.ogg',
    'music/music_loop2.ogg',
    'music/music_loop3.ogg',
  ]) {
    const audio = readFileSync(assetPath(filename));
    assert.equal(audio.toString('ascii', 0, 4), 'OggS', `${filename} is an offline Oregon campaign track`);
  }
});

test('Colt City portrait preload is connected to the game start image list', () => {
  const mainSource = readFileSync(path.join(appRoot, 'src/main.ts'), 'utf8');
  assert.match(mainSource, /import \{ oregon08CampaignPortraitAssets, oregon08WaveIntros \} from '\.\/content\/oregon-08-wave-intros';/);
  assert.match(mainSource, /\.\.\.oregon08CampaignPortraitAssets,/);
});
