import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota03DialogueResource =
  | 'T_CAMPAIGN_33_01'
  | 'T_CAMPAIGN_33_02'
  | 'T_CAMPAIGN_33_03'
  | 'T_CAMPAIGN_33_04'
  | 'T_CAMPAIGN_33_05'
  | 'T_CAMPAIGN_33_06'
  | 'T_CAMPAIGN_33_07'
  | 'T_CAMPAIGN_33_08'
  | 'T_CAMPAIGN_33_09'
  | 'T_CAMPAIGN_33_10';

export interface Dakota03WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota03DialogueResource;
}

const engineer: LocalizedCampaignCopy = Object.freeze({ en: 'Engineer', zh: '工程师' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '印第安人' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const calamity: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Calamity', zh: '俄勒冈女枪手' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈头目' });

/** APK English dialogue and portrait resources; Chinese is translated, with no inferred voice routes. */
const waveIntros: Dakota03WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_33_01',
    speaker: engineer,
    text: {
      en: 'End of the line! Fort Knockout! Please exit the train and position your forces to attack innocent settlers!',
      zh: '终点站到了！堡垒决战！请下火车，部署兵力，攻击那些无辜的拓荒者！',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_33_02',
    speaker: indian,
    text: {
      en: 'Brothers of Dakota, the exploiters are on their way! Let us burn their heads, scalps are passé anyway!',
      zh: '达科他兄弟们，剥削者就要来了！让我们烧掉他们的脑袋吧，反正割头皮早就过时了！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_33_03',
    speaker: geezer,
    text: {
      en: 'Here come some more settlers from the east! Just you wait, you\'ll never be as old as me!',
      zh: '又有一些拓荒者从东边来了！等着瞧吧，你们永远活不到我这么大岁数！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_33_04',
    speaker: calamity,
    text: {
      en: 'Leave the men to me, you old fool! I need some for my bed! As a bedside rug!',
      zh: '男人交给我，你这个老糊涂！我床上还缺几个——拿来当床边地毯！',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_33_05',
    speaker: mexican,
    text: {
      en: 'I can finally test the fireworks from my brother-in-law!',
      zh: '我终于能试试我姐夫做的烟花了！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_33_06',
    speaker: pedro,
    text: {
      en: 'Watch out that you don\'t lose all eight of your fingers!',
      zh: '小心点，别把八根手指全都弄丢了！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_33_07',
    speaker: indian,
    text: {
      en: 'The palefaces take the route on the east side! Dig up the hatchet, we need more men!',
      zh: '白人走东边的路！拿起战斧，我们还需要更多人手！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_33_08',
    speaker: geezer,
    text: {
      en: 'That\'s a two-front war! I see settlers in the south-west and I smell some in the south-east!',
      zh: '这是两线作战！我看见拓荒者在西南边，还闻到东南边也有一群！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_33_09',
    speaker: calamity,
    text: {
      en: 'Come here, I have some friends for you, and every one is faster than you!',
      zh: '过来吧，我给你找了几个朋友，他们每个人都比你快！',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_33_10',
    speaker: boss,
    text: {
      en: 'Hurry up! Distract them, you fools! If I don\'t get home on time, my wife will kill me!',
      zh: '快点！你们这些笨蛋，去引开他们！要是我不能按时回家，我老婆会杀了我的！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const dakota03WaveIntros: readonly Dakota03WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota03CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota03WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
