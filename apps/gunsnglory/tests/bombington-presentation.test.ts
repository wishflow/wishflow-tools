import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { nevada02CampaignId } from '../src/content/nevada-02-identity';
import { bombingtonAmbientMusic, bombingtonBattleMusicForWave, bombingtonBattleMusicLoops } from '../src/content/bombington-music';
import { bombingtonCampaignPortraitAssets, bombingtonWaveIntros } from '../src/content/bombington-wave-intros';
import { CampaignWaveIntroCursor } from '../src/content/cow-gulch-wave-intros';
import { gameAssetRelativePath } from '../src/render/game-asset-path';

const appRoot = path.resolve(import.meta.dirname, '..');

const expectedDialogue = [
  [1, 'T_CAMPAIGN_42_1', 'Mexican', 'portrait_mexican', 'Ay caramba! I like it here! Explosions and plenty horchata drinks!', '哎呀！我喜欢这里！有爆炸，还有喝不完的欧洽塔！'],
  [2, 'T_CAMPAIGN_42_2', 'Pyromaniac', 'portrait_pyromaniac', 'Explosions, we need more explosions!', '爆炸！我们需要更多爆炸！'],
  [3, 'T_CAMPAIGN_42_3', 'Pyromaniac', 'portrait_pyromaniac', 'More settlers are coming, and one by one they are finding all the entrances to Bombington.', '更多拓荒者来了，他们正陆续找到通往炸弹镇的所有入口。'],
  [4, 'T_CAMPAIGN_42_4', 'Pyromaniac', 'portrait_pyromaniac', "Don't worry, my rockets can even reach those settlers in the south-east.", '别担心，我的火箭连东南边的那些拓荒者都能打到。'],
  [5, 'T_CAMPAIGN_42_5', 'Gunslinger', 'portrait_gunslinger', 'More settlers! Nothing my gun couldn\'t handle, yeehaw!', '又来拓荒者了！没什么是我的枪搞不定的，耶哈！'],
  [6, 'T_CAMPAIGN_42_6', 'Pedro', 'portrait_pedro', 'They have found the last remaining passage in the south. Prepare the dynamite!', '他们找到南边最后一条通道了。准备好炸药！'],
  [7, 'T_CAMPAIGN_42_7', 'Mexican', 'portrait_mexican', 'Oh my god, I love this region! So many explosions and so much gold!', '我的天，我太喜欢这片地方了！爆炸这么多，金子也这么多！'],
  [8, 'T_CAMPAIGN_42_8', 'Deserter', 'portrait_deserter', 'Load the cannons, the gold wagons are coming!', '装填大炮，运金马车要来了！'],
  [9, 'T_CAMPAIGN_42_9', 'Pedro', 'portrait_pedro', 'Great, one more group and we are almost done here!', '太好了，再来一群，我们就快搞定了！'],
  [10, 'T_CAMPAIGN_42_10', 'Boss', 'oregon_dakota_portrait_boss', "You won't get my gold! I've survived worse things than this.", '你们别想拿走我的金子！比这更糟的情况我都挺过来了。'],
] as const;

test('Bombington preserves all ten APK dialogues, portrait order and Chinese translations', () => {
  assert.equal(nevada02CampaignId, 'campaign-nevada-02');
  assert.deepEqual(bombingtonWaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, text }) => [
    waveNumber, dialogueResource, speaker.en, portraitAsset, text.en, text.zh,
  ]), expectedDialogue);
  assert.deepEqual(bombingtonWaveIntros.map(({ waveNumber }) => waveNumber), Array.from({ length: 10 }, (_, index) => index + 1));
  assert.ok(bombingtonWaveIntros.every(({ voiceSound }) => voiceSound === undefined),
    'do not assign character voices without APK evidence');
  assert.deepEqual(bombingtonCampaignPortraitAssets, [
    'portrait_mexican', 'portrait_pyromaniac', 'portrait_gunslinger', 'portrait_pedro', 'portrait_deserter',
    'oregon_dakota_portrait_boss',
  ]);

  const cursor = new CampaignWaveIntroCursor(bombingtonWaveIntros);
  assert.deepEqual(Array.from({ length: 10 }, (_, index) => cursor.next(index + 1)?.waveNumber),
    Array.from({ length: 10 }, (_, index) => index + 1));
});

test('Bombington portraits and Nevada music are available offline without playing audio', () => {
  for (const portrait of bombingtonCampaignPortraitAssets) {
    const imagePath = path.join(appRoot, 'public/assets', gameAssetRelativePath(portrait));
    assert.equal(existsSync(imagePath), true, `${portrait} is bundled`);
    assert.equal(readFileSync(imagePath).toString('ascii', 1, 4), 'PNG');
  }

  assert.equal(bombingtonAmbientMusic, 'music_atmo_nevada');
  assert.deepEqual(bombingtonBattleMusicLoops, ['music_nevada', 'music_loop3', 'music_loop4']);
  assert.deepEqual(Array.from({ length: 6 }, (_, index) => bombingtonBattleMusicForWave(index)), [
    'music_nevada', 'music_loop3', 'music_loop4', 'music_nevada', 'music_loop3', 'music_loop4',
  ]);
  assert.throws(() => bombingtonBattleMusicForWave(-1), RangeError);
  for (const track of [bombingtonAmbientMusic, ...bombingtonBattleMusicLoops]) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets/music', `${track}.ogg`));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS', `${track} is bundled as Ogg audio`);
  }

  const mainSource = readFileSync(path.join(appRoot, 'src/main.ts'), 'utf8');
  assert.match(mainSource, /\.\.\.bombingtonCampaignPortraitAssets,/);
  assert.match(mainSource, /if \(scenarioId === nevada02CampaignId\) return bombingtonWaveIntros;/);
  assert.match(mainSource, /session\.startRecord\.scenarioId === nevada02CampaignId/);
  assert.match(mainSource, /setCampaignBackgroundMusic\(nevadaAmbientMusicForCurrentSession\(\)\)/);
  assert.match(mainSource, /nevadaBattleMusicForCurrentSession\(eventWaveNumber - 1\)/);
});
