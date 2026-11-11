import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type LostCityDialogueResource =
  | 'T_CAMPAIGN_10_01'
  | 'T_CAMPAIGN_10_02'
  | 'T_CAMPAIGN_10_03'
  | 'T_CAMPAIGN_10_04'
  | 'T_CAMPAIGN_10_05'
  | 'T_CAMPAIGN_10_06'
  | 'T_CAMPAIGN_10_07'
  | 'T_CAMPAIGN_10_08'
  | 'T_CAMPAIGN_10_09'
  | 'T_CAMPAIGN_10_10';

export interface LostCityWaveIntro extends CampaignWaveIntro {
  dialogueResource: LostCityDialogueResource;
}

/** APK English, speaker portraits, and voice routes; Chinese is a project translation. */
export const lostCityWaveIntros: readonly LostCityWaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_10_01',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "The gulch to the lost city branches out in all directions. We can't lose the settlers there!",
      zh: '通往失落之城的峡谷向四面八方分岔。我们不能让拓荒者在那里走散！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_10_02',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: 'Yeehah! Give me a target!', zh: '耶哈！给我一个目标！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_10_03',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "The lost city is the destination of all the settlers. If we can take control of the city, we'll have the settlers totally in our hands!",
      zh: '所有拓荒者的目的地都是失落之城。只要我们控制这座城，就能把他们牢牢掌握在手里！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_10_04',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Frank, have you got the compass handy? I thought the lost city was more to the west...',
      zh: '弗兰克，你带指南针了吗？我还以为失落之城在更西边……',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_10_05',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "We have to spread out, or we'll lose them!", zh: '我们必须分散开，不然就会跟丢他们！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_10_06',
    speaker: { en: 'Indian', zh: '印第安人' },
    text: {
      en: 'The lost city is the homeland of our ancestors. No settler must ever enter here!',
      zh: '失落之城是我们祖先的家园。绝不能让任何拓荒者踏进这里！',
    },
    portraitAsset: 'portrait_indian',
    voiceSound: 'sound_indian_hugh',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_10_07',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "There's an arrow in your hat. How did that get there? Is that a souvenir?",
      zh: '你帽子上插着一支箭。这是怎么回事？是纪念品吗？',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_10_08',
    speaker: { en: 'Indian', zh: '印第安人' },
    text: {
      en: 'Palefaces are welcome to more souvenirs. They just have to keep still for a moment.',
      zh: '白脸佬还可以再多收些纪念品。只要他们乖乖站一会儿就行。',
    },
    portraitAsset: 'portrait_indian',
    voiceSound: 'sound_indian_hugh',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_10_09',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "They're arriving again with lots of wagons full of gold!", zh: '他们又来了，带着一大批装满黄金的马车！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_10_10',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Victory will soon be ours! Then the lost city will belong only to us!',
      zh: '胜利很快就属于我们！到那时，失落之城就只属于我们！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
]);
