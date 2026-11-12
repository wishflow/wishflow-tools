import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi17DialogueResource =
  | 'T_CAMPAIGN_18_01'
  | 'T_CAMPAIGN_18_02'
  | 'T_CAMPAIGN_18_03'
  | 'T_CAMPAIGN_18_04'
  | 'T_CAMPAIGN_18_05'
  | 'T_CAMPAIGN_18_06'
  | 'T_CAMPAIGN_18_07'
  | 'T_CAMPAIGN_18_08';

export interface Mississippi17WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi17DialogueResource;
}

/** APK English dialogue and portraits; Chinese text is a project translation. */
export const mississippi17WaveIntros: readonly Mississippi17WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_18_01',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "It's so creepy here... hold me tight, honey, so we don't lose each other!", zh: '这里阴森森的……亲爱的，抱紧我，免得我们走散！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_18_02',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "We'll really have to keep our eyes peeled here! I can't tell the settlers from the corpses!", zh: '我们可得睁大眼睛仔细看！我都分不清拓荒者和尸体了！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_18_03',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: 'Boss... where are you? I think I\'m lost!', zh: '老大……你在哪儿？我好像迷路了！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_18_04',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'We have to go left up here... no, right... or is it straight ahead?', zh: '上面这段该往左……不，右边……还是直走？' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_18_05',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: "Señor... I... am really... out of breath... from so much running around! But that should be enough to knock 'em down!", zh: '先生……我……跑来跑去……真的……快喘不过气了！不过这样也足够把他们打倒了！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_18_06',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'Honey, are you sure we have to stay here for a while?', zh: '亲爱的，你确定我们要在这里待一阵子吗？' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_18_07',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "Hmm, I was using this stone as a landmark... I didn't realize there are lots of stones here!", zh: '嗯，我之前把这块石头当作路标……没想到这里到处都是石头！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_18_08',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: 'Boss, everything is spinning around! We should rob the last settlers fast and get outta here!', zh: '老大，天旋地转的！我们得赶紧抢了最后一批拓荒者，然后离开这里！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
]);
