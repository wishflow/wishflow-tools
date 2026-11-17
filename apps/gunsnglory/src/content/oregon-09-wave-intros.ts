import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon09DialogueResource =
  | 'T_CAMPAIGN_29_01'
  | 'T_CAMPAIGN_29_02'
  | 'T_CAMPAIGN_29_03'
  | 'T_CAMPAIGN_29_04'
  | 'T_CAMPAIGN_29_05'
  | 'T_CAMPAIGN_29_06';

export interface Oregon09WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon09DialogueResource;
}

const dynamite: LocalizedCampaignCopy = Object.freeze({ en: 'Dynamite', zh: '炸药专家' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const captain: LocalizedCampaignCopy = Object.freeze({ en: 'Captain', zh: '船长' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK English text, resource IDs, and portraits; Chinese is local translation with no inferred voice. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_29_01',
    speaker: dynamite,
    text: {
      en: 'Finally, some rest! Slow down those settlers and trigger the mines!',
      zh: '终于能歇一会儿了！减缓拓荒者的速度，再引爆地雷！',
    },
    portraitAsset: 'oregon_dakota_portrait_dynamite',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_29_02',
    speaker: geezer,
    text: {
      en: 'Eureka! Lure them out and gather them around our dynamite presents!',
      zh: '找到了！把他们引出来，聚到我们准备的炸药礼物旁边！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_29_03',
    speaker: geezer,
    text: {
      en: '"Presents? Is it someone\'s birthday or death day?"',
      zh: '“礼物？是谁的生日，还是忌日？”',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_29_04',
    speaker: geezer,
    text: {
      en: '"Who\'s dead? I thought the settlers don\'t defend themselves!"',
      zh: '“谁死了？我还以为拓荒者不会反抗呢！”',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_29_05',
    speaker: captain,
    text: {
      en: '"Settlers? Where? I\'ll swab the deck with them!"',
      zh: '“拓荒者？在哪儿？我要把他们全都打趴下！”',
    },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_29_06',
    speaker: boss,
    text: {
      en: '"It should be easy to get through this valley! It\'s as quiet as a retirement home here!"',
      zh: '“穿过这条山谷应该很容易！这里安静得像养老院！”',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon09WaveIntro[];

export const oregon09WaveIntros: readonly Oregon09WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Portraits are decoded with the initial game assets, before the corresponding wave opens. */
export const oregon09CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon09WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
