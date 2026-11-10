import type { CampaignWaveIntro } from './cow-gulch-wave-intros';
import type { MurdockMountainsDialogueResource, MurdockMountainsPortraitAsset } from './murdock-mountains-campaign-waves';

export interface MurdockMountainsWaveIntro extends CampaignWaveIntro {
  dialogueResource: MurdockMountainsDialogueResource;
  portraitAsset: MurdockMountainsPortraitAsset;
}

/** APK English dialogue is retained verbatim; Chinese is the project translation. */
const waveIntros: MurdockMountainsWaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_06_01',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'The rugged Murdock Mountains couldn\'t be better for a good ol\' traditional ambush!',
      zh: '崎岖的默多克山脉，正适合来一场传统的伏击！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_06_02',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Now we can promote our men to level 2 and we\'ll be able to stop a whole convoy of settlers with the Magnificent Seven!',
      zh: '现在我们可以把弟兄们升到 2 级，用“神奇七人组”拦下整支拓荒者车队了！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_06_03',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Hey! You there! Are you heading through the Murdock Mountains, too? Let\'s travel together.',
      zh: '嘿！那边的朋友！你们也要穿过默多克山脉吗？不如和我们结伴同行吧。',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_06_04',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Travel together, huh? Together, you\'ll run right into our arms!',
      zh: '结伴同行？好啊。你们就一起落入我们的手掌心吧！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_06_05',
    speaker: { en: 'Indian', zh: '印第安战士' },
    text: {
      en: 'Today is a good day to go hunting.',
      zh: '今天真是打猎的好日子。',
    },
    portraitAsset: 'portrait_indian',
    voiceSound: 'sound_indian_hugh',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_06_06',
    speaker: { en: 'Deserter', zh: '逃兵' },
    text: {
      en: 'Sir, those civilians are coming with a wagon full of gold. We need more cannons to stop them!',
      zh: '长官，那些平民正赶来，马车上装满了黄金。我们需要更多大炮来拦住他们！',
    },
    portraitAsset: 'portrait_deserter',
    voiceSound: 'sound_deserter_yes_sir',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_06_07',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Did you hear that terrible crash in the mountains, too? Do you think there\'s a storm brewing?',
      zh: '你们也听到山里那声巨响了吗？是不是暴风雨要来了？',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_06_08',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'No, don\'t worry. There isn\'t a cloud in the sky. No storm in sight. Just come to our arms...',
      zh: '不，别担心。天空万里无云，根本没有风暴。来我们这儿吧……',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_01_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Ha ha! Those settlers might just about be able to found a tent camp!',
      zh: '哈哈！那些拓荒者差不多都能搭起帐篷营地了！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_06_09',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Victory is near. They won\'t be able to hold out much longer!',
      zh: '胜利就在眼前。他们撑不了多久了！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
];

export const murdockMountainsWaveIntros: readonly MurdockMountainsWaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);
