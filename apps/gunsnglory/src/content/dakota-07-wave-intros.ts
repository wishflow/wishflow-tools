import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota07DialogueResource =
  | 'T_CAMPAIGN_37_01'
  | 'T_CAMPAIGN_37_02'
  | 'T_CAMPAIGN_37_03'
  | 'T_CAMPAIGN_37_04'
  | 'T_CAMPAIGN_37_05'
  | 'T_CAMPAIGN_37_06'
  | 'T_CAMPAIGN_37_07'
  | 'T_CAMPAIGN_37_08';

export interface Dakota07WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota07DialogueResource;
}

const engineer: LocalizedCampaignCopy = Object.freeze({ en: 'Engineer', zh: '铁路工人' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Geezer', zh: '达科他老爷子' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Boss', zh: '达科他头目' });

/** APK dialogue resource identity, English text and portrait sequence; Chinese text is translated. */
const waveIntros: Dakota07WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_37_01',
    speaker: engineer,
    text: {
      en: '“I\'m sorry for the delay, but the tracks are frozen!”',
      zh: '“抱歉让大家久等了，铁轨都冻住了！”',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_37_02',
    speaker: gunslinger,
    text: {
      en: '“Damn, your railway isn\'t longer than fifty yards! How can there be a delay?”',
      zh: '“见鬼，你们的铁路还不到五十码！怎么会耽误？”',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_37_03',
    speaker: pedro,
    text: {
      en: 'Fortunately, I never have to go by train! There would be a hundred new settlements by the time I got there!',
      zh: '幸好我从来不用坐火车！等我抵达时，这里早就又有一百座新定居点了！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_37_04',
    speaker: geezer,
    text: {
      en: 'Speaking of settlements, here comes a whole bunch of new settlers! The very thing for my scattergun!',
      zh: '说到定居点，看那边来了一大群拓荒者！正好给我的散弹枪练练手！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_37_05',
    speaker: mexican,
    text: {
      en: 'I hate to mention it, but did you see that some settlers are coming from the north-east?',
      zh: '我不想扫兴，不过你们看到有些拓荒者从东北方向来了吗？',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_37_06',
    speaker: geezer,
    text: {
      en: 'North-east? I only see some in the west!',
      zh: '东北？我只看到西边有人！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_37_07',
    speaker: pedro,
    text: {
      en: 'Settlers from the west? Are they lost? I thought they wanted to go west…',
      zh: '西边来的拓荒者？他们迷路了吗？我以为他们想往西走……',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_37_08',
    speaker: boss,
    text: {
      en: '“Damn, those railroad tracks don\'t lead to the west! Looks like I\'ll have to walk…”',
      zh: '“见鬼，铁轨根本不通往西边！看来我只能步行了……”',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const dakota07WaveIntros: readonly Dakota07WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota07CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota07WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
