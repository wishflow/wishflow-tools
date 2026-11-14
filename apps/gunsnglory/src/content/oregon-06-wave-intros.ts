import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon06DialogueResource =
  | 'T_CAMPAIGN_26_01'
  | 'T_CAMPAIGN_26_02'
  | 'T_CAMPAIGN_26_03'
  | 'T_CAMPAIGN_26_04'
  | 'T_CAMPAIGN_26_05'
  | 'T_CAMPAIGN_26_06'
  | 'T_CAMPAIGN_26_07'
  | 'T_CAMPAIGN_26_08';

export interface Oregon06WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon06DialogueResource;
}

const captain: LocalizedCampaignCopy = Object.freeze({ en: 'Captain', zh: '船长' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '原住民' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const deserter: LocalizedCampaignCopy = Object.freeze({ en: 'Deserter', zh: '逃兵' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK English dialogue and portrait references; Chinese text is translated and voice is not inferred. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_26_01',
    speaker: captain,
    text: {
      en: "God bless ya, sailors! It's been quite a while! Let's see if the waters of the Columbia River are as wet as the Mississippi!",
      zh: '愿上帝保佑你们，水手们！好久不见了！看看哥伦比亚河的水是不是和密西西比河一样多！',
    },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_26_02',
    speaker: indian,
    text: {
      en: 'This is our river and our salmon! Palefaces should go fishing elsewhere!',
      zh: '这条河和鲑鱼都是我们的！白人该去别处钓鱼！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_26_03',
    speaker: geezer,
    text: {
      en: 'Isn\'t it possible to enjoy a rheumatism bath in peace?',
      zh: '难道就不能安安静静地泡个治风湿的澡吗？',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_26_04',
    speaker: deserter,
    text: {
      en: 'Sir, reporting enemy contact in the south-east!',
      zh: '长官，东南方向发现敌人！',
    },
    portraitAsset: 'portrait_deserter',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_26_05',
    speaker: pedro,
    text: {
      en: 'Boss, here come some wagons from the Californian Gold Exhibition!',
      zh: '老板，加州黄金展览会的篷车来了！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_26_06',
    speaker: captain,
    text: {
      en: 'Landlubbers ahead! A golden coating of dust is approaching from the north!',
      zh: '前方有旱鸭子！一片金色尘土正从北方逼近！',
    },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_26_07',
    speaker: gunslinger,
    text: {
      en: 'Get me more ammunition! Yeeehah!',
      zh: '再给我拿些弹药来！耶哈！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_26_08',
    speaker: boss,
    text: {
      en: 'Come here, you bandit scum! I\'ll remember your faces in mind and haul all of you into court!',
      zh: '过来吧，你们这些土匪败类！我会记住你们的脸，把你们全都押上法庭！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon06WaveIntro[];

export const oregon06WaveIntros: readonly Oregon06WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Portraits join the game's initial image preload, before their dialogue opens. */
export const oregon06CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon06WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
