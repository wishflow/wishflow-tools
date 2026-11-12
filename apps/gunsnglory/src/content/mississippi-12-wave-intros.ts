import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi12DialogueResource =
  | 'T_CAMPAIGN_12_01'
  | 'T_CAMPAIGN_12_02'
  | 'T_CAMPAIGN_12_03'
  | 'T_CAMPAIGN_12_04'
  | 'T_CAMPAIGN_12_05'
  | 'T_CAMPAIGN_12_06'
  | 'T_CAMPAIGN_12_07';

export interface Mississippi12WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi12DialogueResource;
}

/** APK dialogue strings and speaker assets; Chinese lines are project translations. */
export const mississippi12WaveIntros: readonly Mississippi12WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_12_01',
    speaker: { en: 'Captain', zh: '船长' },
    text: {
      en: "The ship is ready to cast off! You'll soon get wet, you landlubbers!",
      zh: '船已经准备启航了！你们这些旱鸭子很快就要湿身了！',
    },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_12_02',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: 'We need more steamers with more cannons and firepower!',
      zh: '我们需要更多蒸汽船、更多火炮和更强的火力！',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_12_03',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "I love this beautiful calliope music. It reminds me of that film, what's it called again...",
      zh: '我喜欢这美妙的汽笛风琴声，让我想起一部电影来着，叫什么名字呢……',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_12_04',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'I have no idea what the film is called, honey. Something like ONCE UPON A TIME...',
      zh: '亲爱的，我也不知道那部电影叫什么。好像叫《从前有个……》之类的……',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_12_05',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: {
      en: 'That echoing sound coming from both sides... we should patent it and find a name for it!',
      zh: '两边传来的回声……我们应该申请专利，再给它起个名字！',
    },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_12_06',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: "Boss! Boss! They're scared and are starting to run! What should we do?",
      zh: '老大！老大！他们吓坏了，开始逃跑了！我们怎么办？',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_12_07',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: {
      en: 'What should we do? Well... what we do best! Scare them out of their wits!',
      zh: '我们该怎么办？当然是做我们最擅长的事！把他们吓得魂飞魄散！',
    },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
]);
