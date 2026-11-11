import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type RailroadRanchDialogueResource =
  | 'T_CAMPAIGN_09_01'
  | 'T_CAMPAIGN_09_02'
  | 'T_CAMPAIGN_09_03'
  | 'T_CAMPAIGN_09_04'
  | 'T_CAMPAIGN_09_05'
  | 'T_CAMPAIGN_09_06'
  | 'T_CAMPAIGN_09_07';

export interface RailroadRanchWaveIntro extends CampaignWaveIntro {
  dialogueResource: RailroadRanchDialogueResource;
}

/** English dialogue and portrait/audio routes follow APK resources; Chinese is a project translation. */
export const railroadRanchWaveIntros: readonly RailroadRanchWaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_09_01',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "There's only one thing on Railroad Ranch: trains!",
      zh: '铁路牧场只有一样东西：火车！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_09_02',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'We have to use the railroad strategically to trap the settlers in our pincers.',
      zh: '我们得巧妙利用铁路，从两面夹击拓荒者。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_09_03',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "Where do we go now? Haven't we been here before? I think we're going around in a circle...",
      zh: '我们现在该往哪儿走？我们是不是来过这里？我觉得我们一直在绕圈子……',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_09_04',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "Look out! They're coming through the pass in the south, too!",
      zh: '小心！他们也从南边的山口过来了！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_09_05',
    speaker: { en: 'Engineer', zh: '工程师' },
    text: {
      en: "The pot is glowing. The cash box is jingling. That's the way it ought to be!",
      zh: '锅子闪闪发亮，钱箱叮当作响。这才像样！',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_09_06',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "This is just a big gamble! Sometimes they run this way, sometimes they run that way! You don't know which way to turn!",
      zh: '这简直是在碰运气！他们有时往这边跑，有时往那边跑！真让人摸不着头脑！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_09_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'The stragglers are bringing up the rear. That will be all for today.',
      zh: '掉队的人还在后面慢慢跟着。今天就到此为止吧。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
]);
