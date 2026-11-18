import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon11DialogueResource =
  | 'T_CAMPAIGN_31_01'
  | 'T_CAMPAIGN_31_02'
  | 'T_CAMPAIGN_31_03'
  | 'T_CAMPAIGN_31_04'
  | 'T_CAMPAIGN_31_05'
  | 'T_CAMPAIGN_31_06'
  | 'T_CAMPAIGN_31_07'
  | 'T_CAMPAIGN_31_08'
  | 'T_CAMPAIGN_31_09';

export type Oregon11WaveIntro = Omit<CampaignWaveIntro, 'portraitAsset'> & {
  dialogueResource: Oregon11DialogueResource;
  portraitAsset: CampaignWaveIntro['portraitAsset'] | 'oregon_dakota_portrait_calamity';
};

const calamity: LocalizedCampaignCopy = Object.freeze({ en: 'Calamity', zh: '卡拉米蒂' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK English text, resource IDs, and portraits; Chinese is a local translation. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_31_01',
    speaker: calamity,
    text: {
      en: "Howdy, men! You should dress warmly! And just to let you know: one wrong word and I'll shoot off your trouser buttons at a hundred yards!",
      zh: '伙计们，你们该穿暖和些！先说清楚：谁说错一个字，我就从一百码外打掉他的裤子纽扣！',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_31_02',
    speaker: gunslinger,
    text: {
      en: 'I already dressed warmly, sweetheart! Dakota is pretty cold in the winter!',
      zh: '亲爱的，我已经穿得很暖和了！达科他州的冬天可是很冷的！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_31_03',
    speaker: mexican,
    text: {
      en: 'Ey muchacha, why don\'t you strut your stuff? Here come some gold carriers from the south!',
      zh: '嘿，姑娘，何不展示一下你的本事？南边有运金车队过来了！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_31_04',
    speaker: pedro,
    text: {
      en: 'You girls like horses, don\'t you? I\'m just asking, because there\'s a whole herd of horses coming!',
      zh: '姑娘们喜欢马，对吧？我只是问问，因为一大群马正朝这边来了！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_31_05',
    speaker: calamity,
    text: {
      en: 'First, I only like gold! Second, one more crack and you\'ll count as a girl, too!',
      zh: '第一，我只喜欢黄金！第二，再胡说一句，你也算姑娘了！',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_31_06',
    speaker: geezer,
    text: {
      en: 'While you\'re squabbling down there, some more settlers are trudging through the snow in the north-east!',
      zh: '你们在下面吵个不停，东北边又有一批拓荒者正顶着大雪艰难前行！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_31_07',
    speaker: pedro,
    text: {
      en: 'Sir, eh, Ma\'am, eh… They\'re coming from everywhere!',
      zh: '先生，呃，女士，呃……他们从四面八方来了！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_31_08',
    speaker: pedro,
    text: {
      en: 'It\'s my first time with a woman… Robbing some settlers!',
      zh: '我还是第一次和女人一起……抢拓荒者！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_31_09',
    speaker: boss,
    text: {
      en: 'Hell, now they\'re even sending female bandits to get our gold! Come on, try to hit me, I bet you won\'t!',
      zh: '见鬼，他们竟然派女匪徒来抢我们的黄金！来啊，试着打中我，我赌你做不到！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon11WaveIntro[];

export const oregon11WaveIntros: readonly Oregon11WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const oregon11CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon11WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
