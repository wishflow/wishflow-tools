import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi20DialogueResource =
  | 'T_CAMPAIGN_20_01'
  | 'T_CAMPAIGN_20_02'
  | 'T_CAMPAIGN_20_03'
  | 'T_CAMPAIGN_20_04'
  | 'T_CAMPAIGN_20_05'
  | 'T_CAMPAIGN_20_06'
  | 'T_CAMPAIGN_20_07'
  | 'T_CAMPAIGN_20_08';

export interface Mississippi20WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi20DialogueResource;
}

/** APK English dialogue/portraits and only the speaker voice cues with confirmed mappings. */
export const mississippi20WaveIntros: readonly Mississippi20WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_20_01',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "I love horses! They're delicious!", zh: '我喜欢马！它们真好吃！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_20_02',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "I'll put 100 Gold on the brown horse!", zh: '我押100枚金币，赌那匹棕马！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_20_03',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: 'I wish I could ride...', zh: '真希望我也会骑马……' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_20_04',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: 'These short cuts will be our downfall!', zh: '这些抄近路的做法会害惨我们的！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_20_05',
    speaker: { en: 'Captain', zh: '船长' },
    text: { en: "Let's get going!", zh: '我们出发吧！' },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_20_06',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: 'Boss, if horses could talk, would they have accents, too?', zh: '老板，如果马会说话，它们也会有口音吗？' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_20_07',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'Woah! We have to hurry!', zh: '哇！我们得赶快！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_20_08',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: "Yes, hurry! Or you'll be too late for your funeral!", zh: '没错，快点！不然你就赶不上自己的葬礼了！' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
]);
