import type { CampaignWaveIntro } from './cow-gulch-wave-intros';
import type { BillyHillsDialogueResource, BillyHillsPortraitAsset } from './billy-hills-campaign-waves';

export interface BillyHillsWaveIntro extends CampaignWaveIntro {
  dialogueResource: BillyHillsDialogueResource;
  portraitAsset: BillyHillsPortraitAsset;
}

/** APK English strings are retained verbatim; Chinese text is the project translation. */
const intros: BillyHillsWaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_05_01_POINTER',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Now we can also promote our men. They will then inflict more damage and will be faster. To do this, select a unit and touch the icon on the bottom left!',
      zh: '现在我们也能给队伍成员升级了。升级后他们的伤害更高、速度更快。选中一名队员，再点左下角的图标即可！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_05_02',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Who knows where we should head? This is just one big maze!',
      zh: '谁知道我们该往哪儿走？这里简直就是一座大迷宫！',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_05_03',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'If the settlers are full of lead, then our pockets are full of... money!',
      zh: '拓荒者的口袋装满了子弹，我们的口袋就装满了……钱！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_05_04',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'I think I was holding the map the wrong way round! We have to go through the southern canyon.',
      zh: '我想我刚才把地图拿反了！我们得穿过南边的峡谷。',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_05_05',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "We'll show you the way to go. Just come here...",
      zh: '我们给你指条路。来这边吧……',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_05_06',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Horses! Looks like there\'s a whole herd of them!',
      zh: '马！看起来那边有一整群马！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_03_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Loot! Lots of lovely loot!',
      zh: '战利品！好多宝贝！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_05_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'The rush of settlers seems to be dying down again. That must be the last for today.',
      zh: '拓荒者好像又少了起来。今天最后一批应该就是他们了。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
];

export const billyHillsWaveIntros: readonly BillyHillsWaveIntro[] = Object.freeze(
  intros.map((intro) => Object.freeze(intro)),
);
