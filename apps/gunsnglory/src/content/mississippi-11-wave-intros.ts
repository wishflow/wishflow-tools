import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi11DialogueResource =
  | 'T_CAMPAIGN_11_01'
  | 'T_CAMPAIGN_11_02'
  | 'T_CAMPAIGN_11_03'
  | 'T_CAMPAIGN_11_04'
  | 'T_CAMPAIGN_11_05'
  | 'T_CAMPAIGN_11_06'
  | 'T_CAMPAIGN_11_07'
  | 'T_CAMPAIGN_11_08';

export interface Mississippi11WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi11DialogueResource;
}

/** APK English strings and speaker assets are preserved; Chinese is a project translation. */
export const mississippi11WaveIntros: readonly Mississippi11WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_11_01',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "Oh, honey, it's so beautiful here. We should take a rest soon and have a swim in the Mississippi!",
      zh: '哦，亲爱的，这里真美。我们该早点休息，去密西西比河游泳！',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_11_02',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: {
      en: 'A swim, huh? Ha! Who would do that? I have a much better idea...',
      zh: '游泳？哈！谁会那么做？我有个更好的主意……',
    },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_11_03',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: "Boss, there are some more on the way! We'll have some fireworks like on... what's that day called again? ",
      zh: '老板，又有人来了！我们要放烟花，像……那天叫什么来着？',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_11_04',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: {
      en: "It looks like someone got tipped off... They're trying from the other side!",
      zh: '好像有人走漏了消息……他们正从另一边进攻！',
    },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_11_05',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: 'How is our captain doing? He should let off some steam!',
      zh: '我们的船长怎么样了？该让他去放放蒸汽了！',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_11_06',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'We should be careful, honey! Follow me, I know the way...',
      zh: '亲爱的，我们得小心！跟我来，我认得路……',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_11_07',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: {
      en: "Someone scared the herd! We can't let any of them through!",
      zh: '有人惊了牛群！不能让它们逃掉！',
    },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_11_08',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: 'Hey, Boss! I think these are the last!',
      zh: '嘿，老板！我想这些就是最后一批了！',
    },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
]);
