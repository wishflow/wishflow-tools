import type { CampaignWaveIntro } from './cow-gulch-wave-intros';
import type { LuckyLakeDialogueResource, LuckyLakePortraitAsset } from './lucky-lake-campaign-waves';

export interface LuckyLakeWaveIntro extends CampaignWaveIntro {
  dialogueResource: LuckyLakeDialogueResource;
  portraitAsset: LuckyLakePortraitAsset;
}

/** APK English dialogue is retained verbatim; Chinese is the project translation. */
export const luckyLakeWaveIntros: readonly LuckyLakeWaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_07_01',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'We are at Lucky Lake. The settlers often stop off here to replenish their water supplies.',
      zh: '我们到幸运湖了。拓荒者经常在这里停下来补充饮水。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_07_02',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "We have to keep a sharp lookout. They're trying to find their own routes through the valleys!",
      zh: '我们得提高警惕。他们正试着自己找路穿过山谷！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_07_03',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'We have now unlocked level 3. For a few dollars more, our men will now be real crack shots!',
      zh: '我们现在解锁了 3 级。再多花几块钱，弟兄们就能成为真正的神枪手！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_07_04',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Oh, I am so looking forward to our new home in the West!',
      zh: '啊，我真期待我们在西部的新家！',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_07_05',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Hey, Boss! Some settlers are trying to go through the northern pass!',
      zh: '老板！有些拓荒者正试图穿过北边的山口！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_07_06',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "I'm thirsty. Where is this lake exactly? I hope it hasn't dried up...",
      zh: '我好渴。这湖到底在哪里？希望它还没有干涸……',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_07_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'We should drown them in this lake!',
      zh: '我们该把他们淹在这湖里！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_07_08',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "Gold! Soon, we can use this to build a pretty house. Let's bring these new riches to safety quickly.",
      zh: '黄金！很快我们就能用它盖一栋漂亮的房子。快把这笔新财富安全地带走。',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_07_09',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'I am so happy that we sent the gold ahead of us. We have something to look forward to at the end of our journey.',
      zh: '我真高兴我们把黄金先送走了。旅程结束后，我们总算有所期待。',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_07_10',
    speaker: { en: 'Deserter', zh: '逃兵' },
    text: {
      en: 'Sir! As far as I can see, these are the last settlers in this area!',
      zh: '长官！据我所见，这一带最后一批拓荒者就在前面！',
    },
    portraitAsset: 'portrait_deserter',
    voiceSound: 'sound_deserter_yes_sir',
  },
]);
