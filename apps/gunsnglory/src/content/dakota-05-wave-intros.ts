import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota05DialogueResource =
  | 'T_CAMPAIGN_35_01'
  | 'T_CAMPAIGN_35_02'
  | 'T_CAMPAIGN_35_03'
  | 'T_CAMPAIGN_35_04'
  | 'T_CAMPAIGN_35_05'
  | 'T_CAMPAIGN_35_06'
  | 'T_CAMPAIGN_35_07'
  | 'T_CAMPAIGN_35_08'
  | 'T_CAMPAIGN_35_09';

export interface Dakota05WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota05DialogueResource;
}

const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '印第安人' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const captain: LocalizedCampaignCopy = Object.freeze({ en: 'Captain', zh: '船长' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Boss', zh: '达科他头目' });

/** APK English strings and portraits; Chinese is translated, and no voice route is inferred. */
const waveIntros: Dakota05WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_35_01',
    speaker: mexican,
    text: {
      en: '“Boss, I\'m scared… They say that Ghost Town is haunted!”',
      zh: '“老板，我害怕……他们说幽灵镇闹鬼！”',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_35_02',
    speaker: pedro,
    text: {
      en: '“Those aren\'t ghosts, those are sleepy desperadoes, bandits and deserters! But they\'re just as ugly!”',
      zh: '“那不是鬼，是睡着的亡命徒、土匪和逃兵！不过他们一样丑！”',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_35_03',
    speaker: gunslinger,
    text: {
      en: '“I\'m not really sure… Or is it really just chance that a new bandit enters the town for every one that gets hired.”',
      zh: '“我也不太确定……还是说，每雇到一个人，镇上就会碰巧多来一个土匪？”',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_35_04',
    speaker: indian,
    text: {
      en: 'These are the lost souls of our ancestors! Control them and you will control the south!',
      zh: '这些是我们祖先迷失的灵魂！控制他们，你就能控制南方！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_35_05',
    speaker: pedro,
    text: {
      en: 'It looks like some settlers actually dared to cross the streets of Ghost Town in the south! Scare them to death!',
      zh: '看来有些拓荒者竟敢穿过幽灵镇南边的街道！把他们吓个半死！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_35_06',
    speaker: geezer,
    text: {
      en: '“Whether it\'s ghosts or just sleepy gringos, what matters is that they all want just one thing: gold!”',
      zh: '“不管他们是鬼，还是睡着的白人，重要的是他们都只想要一样东西：黄金！”',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_35_07',
    speaker: captain,
    text: {
      en: 'Reporting enemy movement in the north and south!',
      zh: '报告，敌人在北面和南面都有动向！',
    },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_35_08',
    speaker: indian,
    text: {
      en: 'North and south? Yes, I remember that one…',
      zh: '北面和南面？对，我记得那一关……',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_35_09',
    speaker: boss,
    text: {
      en: 'You wanna see a ghost? Here I am! And now tremble to death… And just let me pass through, okay?',
      zh: '想见鬼吗？我就在这儿！现在吓得发抖吧……顺便让我过去，好吗？',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const dakota05WaveIntros: readonly Dakota05WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota05CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota05WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
