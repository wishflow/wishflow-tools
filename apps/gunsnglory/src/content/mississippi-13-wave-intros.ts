import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi13DialogueResource =
  | 'T_CAMPAIGN_13_01'
  | 'T_CAMPAIGN_13_02'
  | 'T_CAMPAIGN_13_03'
  | 'T_CAMPAIGN_13_04'
  | 'T_CAMPAIGN_13_05'
  | 'T_CAMPAIGN_13_06'
  | 'T_CAMPAIGN_13_07'
  | 'T_CAMPAIGN_13_08'
  | 'T_CAMPAIGN_13_09';

export interface Mississippi13WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi13DialogueResource;
}

/** APK English strings, speaker resources and voice routes; Chinese is a project translation. */
export const mississippi13WaveIntros: readonly Mississippi13WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_13_01',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "Hurry, honey! I want to go off and prospect for a little more gold while we're here.",
      zh: '快点，亲爱的！趁我们还在这里，我想再去找点金子。',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_13_02',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: 'Finders, keepers! And I found you!', zh: '谁找到就是谁的！而我找到你们了！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_13_03',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "Boss, what's a gold rush? Is it dangerous?", zh: '老板，什么是淘金热？危险吗？' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_13_04',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: 'Is a gold rush dangerous? Only for other people!', zh: '淘金热危险吗？只对别人危险！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_13_05',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'Maybe we\'ll have better luck on the other side!', zh: '也许到另一边去，我们会更走运！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_13_06',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'Honey, I can see something shiny! Is it gold?', zh: '亲爱的，我看到有东西在闪光！是金子吗？' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_13_07',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "That's not gold! That's my gun, ma'am!", zh: '那不是金子！那是我的枪，夫人！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_13_08',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'We have golden times ahead! Never have the north and south together looked so promising!',
      zh: '好日子就在前头！南北两边从未像现在这样一起显出希望！',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_13_09',
    speaker: { en: 'Deserter', zh: '逃兵' },
    text: {
      en: "The gold deposits should be exhausted soon! Let's get away from these stragglers!",
      zh: '金矿很快就要挖空了！快甩掉这些掉队的人！',
    },
    portraitAsset: 'portrait_deserter',
    voiceSound: 'sound_deserter_yes_sir',
  },
]);
