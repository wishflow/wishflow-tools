import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

/** Fort Kaboom's offline dialogue uses the standard campaign text, not IAP variants. */
const intros: CampaignWaveIntro[] = [
  {
    waveNumber: 1,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'The army has hidden supply crates here. Collect them with a unit to earn lots of rewards!',
      zh: '军队把补给箱藏在了这里。让一名队员收集它们，就能获得丰厚奖励！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "The soldiers of Fort Kaboom love money more than anything. They're bound to desert and join us for a fistful of dollars.",
      zh: '卡布姆堡的士兵最爱钱。他们肯定会为了几块钱开小差，加入我们。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "I always feel claustrophobic in these narrow canyons. Let's take the more open western approach!",
      zh: '我总觉得这些狭窄的峡谷让人喘不过气。我们走更开阔的西侧路线吧！',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'More and more soldiers are deserting. Watch where the cannons go; if they leave the fort, you can then hire them later!',
      zh: '越来越多的士兵正在开小差。留意大炮的动向；如果它们离开堡垒，之后你就能招募它们！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'We actually want to go west, so why are we always traveling east? Aww, what the heck!',
      zh: '我们明明想往西走，怎么总是在往东走？算了，管他的！',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 6,
    speaker: { en: 'Deserter', zh: '逃兵' },
    text: {
      en: 'Sir, our spies report that hundreds of settlers are approaching from all directions.',
      zh: '长官，我们的探子报告，有数百名拓荒者正从四面八方逼近。',
    },
    portraitAsset: 'portrait_deserter',
    voiceSound: 'sound_deserter_yes_sir',
  },
  {
    waveNumber: 7,
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
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Hee hee hee! Come here!',
      zh: '嘿嘿嘿！过来！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 9,
    speaker: { en: 'Deserter', zh: '逃兵' },
    text: {
      en: 'Sir, a large group of riders is approaching!',
      zh: '长官，一大群骑手正朝这边赶来！',
    },
    portraitAsset: 'portrait_deserter',
    voiceSound: 'sound_deserter_yes_sir',
  },
  {
    waveNumber: 10,
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "Looks like that's all. No, wait... more are arriving!",
      zh: '看来就这些了。不，等等……又有人来了！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
];

// The APK wave dialog selects its character SFX by portrait ID in InGameGeneralMessageDialog.setUpDialog.
export const fortKaboomWaveIntros: readonly CampaignWaveIntro[] = Object.freeze(
  intros.map((intro) => Object.freeze(intro)),
);
