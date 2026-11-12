import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi16DialogueResource =
  | 'T_CAMPAIGN_16_01'
  | 'T_CAMPAIGN_16_02'
  | 'T_CAMPAIGN_16_03'
  | 'T_CAMPAIGN_16_04'
  | 'T_CAMPAIGN_16_05'
  | 'T_CAMPAIGN_16_06'
  | 'T_CAMPAIGN_16_07'
  | 'T_CAMPAIGN_16_08';

export interface Mississippi16WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi16DialogueResource;
}

/** APK English dialogue and portraits; Chinese text is a project translation. */
export const mississippi16WaveIntros: readonly Mississippi16WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_16_01',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "We're safe here, honey! The soldiers from the forts would never get mixed up with bandits!", zh: '亲爱的，这里安全了！堡垒里的士兵绝不会和土匪混在一起！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_16_02',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "I can't hear the others any more. It must be safe here.", zh: '我已经听不见其他人了。这里一定安全了。' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_16_03',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'Look! The soldier up there is waving to us with his cannon!', zh: '看！上面的士兵正挥舞着他的加农炮向我们打招呼！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_16_04',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'I wonder if the poor soldiers have to climb up here to their fort every day.', zh: '不知道可怜的士兵是不是每天都得爬到这里的堡垒里。' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_16_05',
    speaker: { en: 'Deserter', zh: '逃兵' },
    text: { en: "Enemy sighted at 12 o'clock!", zh: '十二点钟方向发现敌人！' },
    portraitAsset: 'portrait_deserter',
    voiceSound: 'sound_deserter_yes_sir',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_16_06',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "Enemy at 12 o'clock? Is it that time already? And whaddya mean, enemy? I thought we were the enemy!", zh: '十二点钟方向有敌人？已经到那个时间了吗？你说敌人是什么意思？我还以为我们才是敌人呢！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_16_07',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "It's practically an invasion!", zh: '这简直就是一场入侵！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_16_08',
    speaker: { en: 'Deserter', zh: '逃兵' },
    text: { en: 'We need more cannons!', zh: '我们需要更多加农炮！' },
    portraitAsset: 'portrait_deserter',
    voiceSound: 'sound_deserter_yes_sir',
  },
]);
