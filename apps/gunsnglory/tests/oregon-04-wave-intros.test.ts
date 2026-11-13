import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { oregon04CampaignCopy, oregon04CampaignCopyResources } from '../src/content/oregon-04-campaign-copy';
import { oregon04CampaignWaves } from '../src/content/oregon-04-campaign-waves';
import { oregon04CampaignPortraitAssets, oregon04WaveIntros } from '../src/content/oregon-04-wave-intros';

const expectedIntros = [
  ['T_CAMPAIGN_24_01', 'Deserter', '逃兵', 'portrait_deserter', "Sir, the cannons of Fort Echo are ready to fire! We're waiting for your orders… orders… orders…", '长官，回声堡的加农炮已经准备开火！我们正等候您的命令……命令……命令……'],
  ['T_CAMPAIGN_24_02', 'Settlers', '拓荒者', 'portrait_settlers', "Honey, we should have taken a map with us! We' ll never find a way out of here… here… here…", '亲爱的，我们真该带张地图！我们永远也找不到出路了……路……路……'],
  ['T_CAMPAIGN_24_03', 'Settlers', '拓荒者', 'portrait_settlers', 'Fiddlesticks! A map just costs gold! You should trust my instincts! I know the way… way… way…', '胡说八道！地图可要花钱！你该相信我的直觉！我知道路怎么走……走……走……'],
  ['T_CAMPAIGN_24_04', 'Oregon Geezer', '俄勒冈老爷子', 'oregon_dakota_portrait_geezer', 'Hell, my back hurts from all this valley bending… bending… bending…', '见鬼，这一路在峡谷里弯来绕去，背都疼了……绕来绕去……绕来绕去……'],
  ['T_CAMPAIGN_24_05', 'Indian', '原住民', 'portrait_indian', 'Old man should drink more fire-water! Wakes up the spirits and burns down the enemy! …enemy… enemy…', '老头该多喝点烈酒！既能提振精神，还能把敌人烧个精光！……敌人……敌人……'],
  ['T_CAMPAIGN_24_06', 'Mexican', '墨西哥人', 'portrait_mexican', "Ay, those settlers breed like the flies on Pedro's back! …back…back…", '哎呀，那些拓荒者繁殖得跟佩德罗背上的苍蝇一样快！……背上……背上……'],
  ['T_CAMPAIGN_24_07', 'Pedro', '佩德罗', 'portrait_pedro', "Boss, now they're trying in the south-east! …east… east…", '头儿，他们现在正试图从东南边突破！……东边……东边……'],
  ['T_CAMPAIGN_24_08', 'Oregon Geezer', '俄勒冈老爷子', 'oregon_dakota_portrait_geezer', "Upon my soul, they're everywhere! My legs won't play along anymore… more… more…", '看在老天爷的份上，他们到处都是！我的腿已经不听使唤了……了……了……'],
  ['T_CAMPAIGN_24_09', 'Deserter', '逃兵', 'portrait_deserter', 'Sir, we need more guns! …guns… guns…', '长官，我们需要更多枪炮！……枪炮……枪炮……'],
  ['T_CAMPAIGN_24_10', 'Oregon Boss', '俄勒冈首领', 'oregon_dakota_portrait_boss', 'Ugh! Men, women, your country needs you! Be my shield and get me through this damned valley! …valley… valley…', '呃！男人女人们，国家需要你们！给我当盾牌，护送我穿过这该死的山谷！……山谷……山谷……'],
] as const;

test('Fort Echo title and overview match APK resources and include a Chinese translation', () => {
  assert.deepEqual(oregon04CampaignCopyResources, {
    title: 'T_LEVEL_NAME_27',
    overview: 'T_LEVEL_INFO_27',
  });
  assert.deepEqual(oregon04CampaignCopy.title, { en: 'Fort Echo', zh: '回声堡' });
  assert.deepEqual(oregon04CampaignCopy.overview, {
    en: 'The surround sound around the high placed Fort Echo is fabulous for every traveler.',
    zh: '高高耸立的回声堡四周环绕着美妙回声，令每位旅人心旷神怡。',
  });
});

test('all ten Fort Echo dialogue resources, portraits, language labels and wave delays match the audit', () => {
  assert.deepEqual(oregon04WaveIntros.map(({ dialogueResource, speaker, portraitAsset, text }) => [
    dialogueResource,
    speaker.en,
    speaker.zh,
    portraitAsset,
    text.en,
    text.zh,
  ]), expectedIntros);
  assert.deepEqual(oregon04WaveIntros.map(({ waveNumber }) => waveNumber), Array.from({ length: 10 }, (_, index) => index + 1));
  assert.deepEqual(oregon04WaveIntros.map(({ waveNumber }) => oregon04CampaignWaves[waveNumber - 1]?.delayMs), [
    15_000, 15_000, 15_000, 20_000, 15_000, 15_000, 20_000, 15_000, 15_000, 25_000,
  ]);
  assert.ok(oregon04WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
  assert.ok(oregon04WaveIntros.every(({ voiceSound }) => voiceSound === undefined), 'no unsupported voice mapping is added');
});

test('every distinct dialogue portrait is a valid local PNG and part of the startup preload list', () => {
  assert.deepEqual(oregon04CampaignPortraitAssets, [
    'portrait_deserter',
    'portrait_settlers',
    'oregon_dakota_portrait_geezer',
    'portrait_indian',
    'portrait_mexican',
    'portrait_pedro',
    'oregon_dakota_portrait_boss',
  ]);
  for (const asset of oregon04CampaignPortraitAssets) {
    const png = readFileSync(new URL(`../public/assets/${asset}.png`, import.meta.url));
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${asset} PNG signature`);
  }
  assert.equal(oregon04CampaignPortraitAssets.includes('oregon_dakota_portrait_dynamite'), false,
    'the APK portrait has no current web consumer and is not bundled speculatively');
});
