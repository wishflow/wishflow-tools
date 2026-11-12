import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi18DialogueResource =
  | 'T_CAMPAIGN_17_01'
  | 'T_CAMPAIGN_17_02'
  | 'T_CAMPAIGN_17_03'
  | 'T_CAMPAIGN_17_04'
  | 'T_CAMPAIGN_17_05'
  | 'T_CAMPAIGN_17_06'
  | 'T_CAMPAIGN_17_07'
  | 'T_CAMPAIGN_17_08';

export interface Mississippi18WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi18DialogueResource;
}

/** APK dialogue and portraits; Chinese text is a project translation. */
export const mississippi18WaveIntros: readonly Mississippi18WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_17_01',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: 'Welcome to Shadow Town!', zh: '欢迎来到影镇！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_17_02',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: 'Welcome? Are you talking to me?', zh: '欢迎？你是在跟我说话吗？' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_17_03',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "A town... at last! I'm sure we'll be able to rest here!", zh: '终于有一座小镇了！我们肯定能在这里歇一歇！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_17_04',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "More are on their way! Let's show them some hospitality!", zh: '还有更多敌人赶来！让我们好好招待他们！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_17_05',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: 'All roads lead to... Shadow Town!', zh: '所有道路都通向……影镇！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_17_06',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "Boss, when I see all the settlers here, I realize we still don't have a cemetery!", zh: '老大，看到这里这么多拓荒者，我才想起来我们还没有墓地！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_17_07',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: 'Whaddya mean, cemetery? We have two saloons; what more do you want?', zh: '你说什么墓地？我们有两间酒馆，还想要什么？' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_17_08',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "That's what I call a boom town! BOOM!", zh: '这才叫爆炸小镇！轰！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
]);
