import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota06DialogueResource =
  | 'T_CAMPAIGN_36_01'
  | 'T_CAMPAIGN_36_02'
  | 'T_CAMPAIGN_36_03'
  | 'T_CAMPAIGN_36_04'
  | 'T_CAMPAIGN_36_05'
  | 'T_CAMPAIGN_36_06'
  | 'T_CAMPAIGN_36_07'
  | 'T_CAMPAIGN_36_08'
  | 'T_CAMPAIGN_36_09';

export interface Dakota06WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota06DialogueResource;
}

const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const calamity: LocalizedCampaignCopy = Object.freeze({ en: 'Calamity', zh: '卡拉米蒂' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const settlers: LocalizedCampaignCopy = Object.freeze({ en: 'Settlers', zh: '拓荒者' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '印第安人' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Boss', zh: '达科他头目' });

/** APK English strings, resource IDs and portraits; Chinese is translated, with no inferred voice route. */
const waveIntros: Dakota06WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_36_01',
    speaker: mexican,
    text: {
      en: '“Brrrr, it\'s very cold here, Boss. Isn\'t there a winter coat upgrade?”',
      zh: '“老板，这里冷死了。就没有冬装升级吗？”',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_36_02',
    speaker: calamity,
    text: {
      en: '“Don\'t make such a fuss! I don\'t see why you all have to be such wusses! ”',
      zh: '“别这么大惊小怪！我不明白你们为什么都这么胆小！”',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_36_03',
    speaker: gunslinger,
    text: {
      en: 'Not everybody is as cold-blooded as you are, kid!',
      zh: '不是每个人都像你这么冷血，小子！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_36_04',
    speaker: calamity,
    text: {
      en: '“If you want me to warm you up, just keep on like that. I\'ve already got you in my sights!”',
      zh: '“你要是再这样，我就给你暖暖身子。我已经瞄准你了！”',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_36_05',
    speaker: pedro,
    text: {
      en: '“Kids, you sound like you\'re married! You better aim your weapons at those settlers!”',
      zh: '“孩子们，你们说话听起来像一对夫妻！快把武器对准那些拓荒者！”',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_36_06',
    speaker: geezer,
    text: {
      en: '“Hey, you there in the north-east! Are you settlers? Don\'t be scared, I\'m just asking!”',
      zh: '“东北边的，你们是拓荒者吗？别害怕，我只是问问！”',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_36_07',
    speaker: settlers,
    text: {
      en: 'Look, honey, over there! That old man is waving with a scattergun!',
      zh: '看，亲爱的，那边有个老头在挥舞霰弹枪！',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_36_08',
    speaker: indian,
    text: {
      en: '“The white men\'s gold is on the way! My preciousss!”',
      zh: '“白人的黄金就要到手了！我的宝贝……”',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_36_09',
    speaker: boss,
    text: {
      en: '“You\'ll never get my gold, you scoundrels! Only over my dead body!”',
      zh: '“你们这群恶棍休想拿走我的黄金！除非从我的尸体上踏过去！”',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const dakota06WaveIntros: readonly Dakota06WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota06CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota06WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
