import type { CampaignWaveIntro } from './cow-gulch-wave-intros';

export type Mississippi19DialogueResource =
  | 'T_CAMPAIGN_19_01'
  | 'T_CAMPAIGN_19_02'
  | 'T_CAMPAIGN_19_03'
  | 'T_CAMPAIGN_19_04'
  | 'T_CAMPAIGN_19_05'
  | 'T_CAMPAIGN_19_06'
  | 'T_CAMPAIGN_19_07'
  | 'T_CAMPAIGN_19_08';

export interface Mississippi19WaveIntro extends CampaignWaveIntro {
  dialogueResource: Mississippi19DialogueResource;
}

/** APK English dialogue and portraits; Chinese text is a project translation. */
export const mississippi19WaveIntros: readonly Mississippi19WaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_19_01',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: 'The sound of the waterfall makes me want to take a leak!', zh: '听着瀑布声，我都想找个地方撒尿了！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_19_02',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: 'I wonder how deep it is here...', zh: '不知道这里有多深……' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_19_03',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: { en: "I can't tell you how deep it is here, honey! So it must be three-dimensional!", zh: '亲爱的，我说不出这里有多深！所以这里一定是立体的！' },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_19_04',
    speaker: { en: 'Indian', zh: '印第安人' },
    text: { en: 'Palefaces on right! Blue Buffalo is drawing his bow!', zh: '右边有白人！蓝野牛正在拉弓！' },
    portraitAsset: 'portrait_indian',
    voiceSound: 'sound_indian_hugh',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_19_05',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: 'The settlers are splashing around!', zh: '拓荒者们正在水里扑腾！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_19_06',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: { en: "Boss! I can't cross the waterfall! I can't jump!", zh: '老大！我过不去瀑布！我不会跳！' },
    portraitAsset: 'portrait_mexican',
    voiceSound: 'sound_mexican_arriba',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_19_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: { en: 'The settlers are coming in droves!', zh: '拓荒者成群结队地赶来了！' },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_19_08',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: { en: 'The waterfall should soon be covered in dust.', zh: '瀑布很快就会被尘土笼罩。' },
    portraitAsset: 'portrait_gunslinger',
    voiceSound: 'sound_desperado_yihaa',
  },
]);
