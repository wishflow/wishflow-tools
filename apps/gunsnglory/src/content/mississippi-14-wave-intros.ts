import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi14DialogueResource =
  | 'T_CAMPAIGN_14_01'
  | 'T_CAMPAIGN_14_02'
  | 'T_CAMPAIGN_14_03'
  | 'T_CAMPAIGN_14_04'
  | 'T_CAMPAIGN_14_05'
  | 'T_CAMPAIGN_14_06'
  | 'T_CAMPAIGN_14_07';

export interface Mississippi14WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi14DialogueResource;
}

/** APK English dialogue and voice routes; Chinese lines are project translations. */
export const mississippi14WaveIntros: readonly Mississippi14WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_14_01',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "I can't help feeling we forgot something...", zh: '我总觉得我们忘了什么……' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_14_02',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: {
      en: 'Of course, you forgot something... to take out a life insurance policy!',
      zh: '当然，你们忘了件事……买份人寿保险！',
    },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_14_03',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: 'What a lovely view from up here, Boss! It must be all those pretty lady settlers!',
      zh: '老板，这里的景色真美！一定是因为有那么多漂亮的拓荒者姑娘！',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_14_04',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'The deeper the valley, the higher the quota of settlers!',
      zh: '山谷越深，拓荒者的配额就越高！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_14_05',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: 'Señor, I need more settlers... fast! I already lit my dynamite!',
      zh: '先生，我得赶快抓到更多拓荒者！我的炸药已经点着了！',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_14_06',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: "There isn't enough dynamite for what we need here!",
      zh: '这些炸药不够我们在这里用了！',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_14_07',
    speaker: { en: 'Indian', zh: '印第安人' },
    text: {
      en: 'White man and white woman everywhere. Hear war cry of my tribe!',
      zh: '到处都是白人男人和女人。听听我族人的战吼！',
    },
    portraitAsset: 'portrait_indian',
    voiceSound: 'sound_indian_hugh',
  },
]);
