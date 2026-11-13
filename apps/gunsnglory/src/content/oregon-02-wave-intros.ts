import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon02DialogueResource =
  | 'T_CAMPAIGN_22_01'
  | 'T_CAMPAIGN_22_02'
  | 'T_CAMPAIGN_22_03'
  | 'T_CAMPAIGN_22_04'
  | 'T_CAMPAIGN_22_05'
  | 'T_CAMPAIGN_22_06'
  | 'T_CAMPAIGN_22_07'
  | 'T_CAMPAIGN_22_08'
  | 'T_CAMPAIGN_22_09';

export interface Oregon02WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon02DialogueResource;
}

const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const settlers: LocalizedCampaignCopy = Object.freeze({ en: 'Settlers', zh: '拓荒者' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Geezer', zh: '老爷子' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const cattleBaron: LocalizedCampaignCopy = Object.freeze({ en: 'Cattle Baron', zh: '牧场主' });

/** APK English campaign strings and portraits; Chinese is translated, with no inferred voice routes. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_22_01',
    speaker: gunslinger,
    text: {
      en: 'The greener the grass, the more golden the gold! And I love gold! Yeehaaaah!',
      zh: '草越绿，金子越亮！我最喜欢金子了！耶哈！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_22_02',
    speaker: settlers,
    text: {
      en: 'Honey, I love this place. Why don\'t we just settle here?',
      zh: '亲爱的，我喜欢这里。我们干脆就在这里定居吧？',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_22_03',
    speaker: settlers,
    text: {
      en: 'Darling, the whole area belongs to that smelly, old cattle baron who\'s following us… I\'m glad he\'s walking in the back of our group!',
      zh: '亲爱的，这一带都归那个臭烘烘的老牧场主所有，他还跟在我们后面……幸好他走在队伍最后！',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_22_04',
    speaker: pedro,
    text: {
      en: 'Boss, they\'re all coming to us! Let\'s welcome them!',
      zh: '老板，他们全都朝我们来了！好好招待他们！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_22_05',
    speaker: geezer,
    text: {
      en: 'Now that reminds me of the old days! Back when I was young!',
      zh: '这让我想起了过去！想起我年轻的时候！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_22_06',
    speaker: mexican,
    text: {
      en: 'When you were young? There weren\'t even any settlers back then, old man!',
      zh: '你年轻的时候？那会儿连拓荒者都还没有呢，老头！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_22_07',
    speaker: gunslinger,
    text: {
      en: 'I\'ll buy a red horse with all that gold! Newly imported from Italy!',
      zh: '有了这些金子，我要买一匹红马！意大利新进口的！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_22_08',
    speaker: cattleBaron,
    text: {
      en: 'Can\'t you walk faster? I don\'t like it when someone tramps down my grass! You better not be here anymore when I catch up with you in a few minutes!',
      zh: '你不能走快点吗？我可不喜欢别人踩坏我的草地！几分钟后我追上你时，最好别让我看见你还在这儿！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_22_09',
    speaker: cattleBaron,
    text: {
      en: 'What\'s going on here? Bandits? I don\'t wanna see any settlers or scoundrels here! I\'m going to report this to the Sheriff!',
      zh: '这里怎么回事？土匪？我可不想看到任何拓荒者或无赖待在这里！我要去向警长报告！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon02WaveIntro[];

export const oregon02WaveIntros: readonly Oregon02WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);
