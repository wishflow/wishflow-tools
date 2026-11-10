import type { CampaignWaveIntro } from './cow-gulch-wave-intros';
import type { CactusvilleDialogueResource, CactusvillePortraitAsset } from './cactusville-campaign-waves';

export interface CactusvilleWaveIntro extends CampaignWaveIntro {
  dialogueResource: CactusvilleDialogueResource;
  portraitAsset: CactusvillePortraitAsset;
}

/** English strings are APK text resources; Chinese copy is a project translation. */
export const cactusvilleWaveIntros: readonly CactusvilleWaveIntro[] = Object.freeze([
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_08_01',
    speaker: { en: 'Sheriff', zh: '警长' },
    text: {
      en: "Gentlemen, I'm Sheriff Jimmy Starforce. If I see or hear that any of you is stirring up the tiniest bit of trouble, I'll take you apart like you won't believe!",
      zh: '各位先生，我是吉米·星力警长。要是让我看到或听到你们任何人惹出一点麻烦，我就让你们见识什么叫吃不了兜着走！',
    },
    portraitAsset: 'portrait_sheriff',
    voiceSound: 'sound_sheriff',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_08_02',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "He'll have to get down off his high horse. He won't hear anything bad about us, so we have to attack with everything we've got to make sure!",
      zh: '他得从那匹高头大马上下来才行。他可不会听到关于我们的坏消息，所以我们得全力进攻，确保他能听见！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_08_03',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: 'Do you see the narrow pass up ahead? Maybe it\'s a shortcut...',
      zh: '你们看见前面那条狭窄的山口了吗？也许那是条近路……',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_08_04',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "How annoying that we can't barricade this shortcut.",
      zh: '真烦人，我们没法把这条近路堵起来。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_08_05',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'There are hardly any wagons coming. Only the weary ranks on foot!',
      zh: '几乎没有马车过来，只有疲惫的步兵队伍！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_08_06',
    speaker: { en: 'Engineer', zh: '工程师' },
    text: {
      en: "Riders ahead! More fodder for my Gatling.",
      zh: '前面有骑兵！又有给我的加特林送上门的活靶子。',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_08_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Those settlers are really talented... at being living targets!',
      zh: '那些拓荒者还真有天赋……天生就是活靶子！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_08_08',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "Watch out! We can't let anyone get away. Sheriff Starforce is really tough!",
      zh: '小心！不能让任何人逃走。星力警长可不好对付！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_08_09',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "Let's send the precious gold wagon on ahead.",
      zh: '让装着贵重黄金的马车先走吧。',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_08_10',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "There's still a wagon train in sight, and then we'd better vamoose before the Sheriff shows up.",
      zh: '前面还看得见一队马车，我们最好赶在警长出现前溜之大吉。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
]);
