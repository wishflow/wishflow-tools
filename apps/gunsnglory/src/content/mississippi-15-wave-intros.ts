import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi15DialogueResource =
  | 'T_CAMPAIGN_15_01'
  | 'T_CAMPAIGN_15_02'
  | 'T_CAMPAIGN_15_03'
  | 'T_CAMPAIGN_15_04'
  | 'T_CAMPAIGN_15_05'
  | 'T_CAMPAIGN_15_06'
  | 'T_CAMPAIGN_15_07'
  | 'T_CAMPAIGN_15_08'
  | 'T_CAMPAIGN_15_09';

export interface Mississippi15WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi15DialogueResource;
}

/** APK English dialogue and portrait resources; Chinese lines are project translations. */
export const mississippi15WaveIntros: readonly Mississippi15WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_15_01',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "Didn't you say that we could take the train from here?", zh: '你不是说我们可以从这里坐火车离开吗？' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_15_02',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "Take the train? Sure, we could, but it's been delayed... they're still building the track!", zh: '坐火车？当然可以，不过火车晚点了……他们还在修铁轨呢！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_15_03',
    speaker: { en: 'Engineer', zh: '工程师' },
    text: { en: 'All aboard! The train has just arrived in the happy hunting grounds!', zh: '请上车！列车刚刚驶进了狩猎天堂！' },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_15_04',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "Boss, I don't think even they know where to go!", zh: '老板，我看连他们自己都不知道该往哪儿走！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_15_05',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: 'I smell new victims!', zh: '我闻到了新猎物的气味！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_15_06',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "I don't think it's the victims you can smell...", zh: '我觉得你闻到的恐怕不是猎物……' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_15_07',
    speaker: { en: 'Engineer', zh: '工程师' },
    text: { en: "I'll use your gold to extend the railroad track! Home to me!", zh: '我会用你们的黄金延长铁路！这里就是我的家！' },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_15_08',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "What the... now they're coming from the north, too! We have to hurry!", zh: '什么……现在北边也来人了！我们得抓紧！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_15_09',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: "Dammit! We're in a tight spot!", zh: '该死！我们陷入绝境了！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
]);
