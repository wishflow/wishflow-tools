import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { oregon01CampaignCopy } from '../src/content/oregon-01-campaign-copy';
import { oregon01CampaignId } from '../src/content/oregon-01-identity';
import { oregon01AmbientMusic, oregon01BattleMusicForWave, oregon01BattleMusicLoops } from '../src/content/oregon-01-music';
import { oregon01WaveIntros } from '../src/content/oregon-01-wave-intros';

const appRoot = path.resolve(import.meta.dirname, '..');
const expectedDialogues = [
  {
    resource: 'T_CAMPAIGN_21_01', speaker: 'Pedro', portrait: 'portrait_pedro',
    text: "Hey, Boss! It was a good idea to vacation at Oregon Trail! Just relaxing and picking settlers' pockets for gold! Ay, caramba!",
  },
  {
    resource: 'T_CAMPAIGN_21_02', speaker: 'Geezer', portrait: 'oregon_dakota_portrait_geezer',
    text: "Pickpocketing a colt from settlers? Bah, I'll keep to my good old scattergun! It stuns butts and legs!",
  },
  {
    resource: 'T_CAMPAIGN_21_03', speaker: 'Geezer', portrait: 'oregon_dakota_portrait_geezer',
    text: "Grrr, I hate those smelly horses and modern stagecoaches! Let's see what my pepper volleys can do here!",
  },
  {
    resource: 'T_CAMPAIGN_21_04', speaker: 'Pedro', portrait: 'portrait_pedro',
    text: 'Hey, old man, just let us deal with the horses and coaches! You can take on the settlers that are coming from the south on foot!',
  },
  {
    resource: 'T_CAMPAIGN_21_05', speaker: 'Geezer', portrait: 'oregon_dakota_portrait_geezer',
    text: "Screw you! Are those trees or settlers? You know, my eyes aren't as young as they used to be! Whatever, I'll shoot it!",
  },
  {
    resource: 'T_CAMPAIGN_21_06', speaker: 'Mexican', portrait: 'portrait_mexican',
    text: "We'll be rich! They're coming from everywhere! Arriba! Arriba! Ándale!",
  },
  {
    resource: 'T_CAMPAIGN_21_07', speaker: 'Gunslinger', portrait: 'portrait_gunslinger',
    text: 'Yeehah! Make your Colts smoke, men!',
  },
  {
    resource: 'T_CAMPAIGN_21_08', speaker: 'Pedro', portrait: 'portrait_pedro',
    text: "Boss, the Sheriff's on his way! We should get out of here, with the gold from these last settlers!",
  },
] as const;

test('Eastwood identity and bilingual copy follow the APK resource strings', () => {
  assert.equal(oregon01CampaignId, 'campaign-oregon-01');
  assert.deepEqual(oregon01CampaignCopy.title, { en: 'Eastwood Forest', zh: '东林地' });
  assert.equal(oregon01CampaignCopy.overview.en,
    'A famous cowboy with a white DeLorean coach gave the name for this idyllic forest.');
  assert.ok(oregon01CampaignCopy.overview.zh.length > 0);
  assert.equal('victoryTitle' in oregon01CampaignCopy, false,
    'the APK does not define a dedicated level-21 victory title');
});

test('Eastwood wave intros preserve all APK strings, portrait IDs, and omit unverified voice routes', () => {
  assert.deepEqual(oregon01WaveIntros.map((intro) => ({
    resource: intro.dialogueResource,
    speaker: intro.speaker.en,
    portrait: intro.portraitAsset,
    text: intro.text.en,
  })), expectedDialogues);
  assert.deepEqual(oregon01WaveIntros.map(({ waveNumber }) => waveNumber), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(oregon01WaveIntros.every((intro) => intro.text.zh.length > 0));
  assert.ok(oregon01WaveIntros.every((intro) => intro.voiceSound === undefined));
});

test('Eastwood bundles the original Geezer portrait and OGG music without decoding or playing audio', () => {
  const portraitPath = path.join(appRoot, 'public/assets/oregon_dakota_portrait_geezer.png');
  const musicPath = path.join(appRoot, 'public/assets/music/music_oregon.ogg');
  assert.equal(existsSync(portraitPath), true);
  const portrait = readFileSync(portraitPath);
  assert.equal(portrait.toString('ascii', 1, 4), 'PNG');
  assert.deepEqual([portrait.readUInt32BE(16), portrait.readUInt32BE(20)], [96, 96]);
  assert.equal(existsSync(musicPath), true);
  const music = readFileSync(musicPath);
  assert.equal(music.toString('ascii', 0, 4), 'OggS');
  assert.equal(music.length, 787_340);
});

test('Eastwood selects the original ambient loop and cycles the three battle tracks by wave', () => {
  assert.equal(oregon01AmbientMusic, 'music_atmo_forest');
  assert.deepEqual(oregon01BattleMusicLoops, ['music_oregon', 'music_loop2', 'music_loop3']);
  for (const track of [oregon01AmbientMusic, ...oregon01BattleMusicLoops]) {
    assert.equal(existsSync(path.join(appRoot, `public/assets/music/${track}.ogg`)), true, `${track} must be bundled offline`);
  }
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => oregon01BattleMusicForWave(index)), [
    'music_oregon', 'music_loop2', 'music_loop3', 'music_oregon',
    'music_loop2', 'music_loop3', 'music_oregon', 'music_loop2',
  ]);
  assert.throws(() => oregon01BattleMusicForWave(-1), RangeError);
});
