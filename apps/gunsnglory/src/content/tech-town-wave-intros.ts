import type { CampaignWaveIntro } from './cow-gulch-wave-intros';
import type { TechTownDialogueResource, TechTownPortraitAsset } from './tech-town-campaign-waves';

export interface TechTownWaveIntro extends CampaignWaveIntro {
  dialogueResource: TechTownDialogueResource;
  portraitAsset: TechTownPortraitAsset;
}

/** APK English strings are retained verbatim; Chinese text is the project translation. */
const intros: TechTownWaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_IA_CAMPAIGN_04_01',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "The railroad could be our most powerful weapon, if we mount deadly Gatling guns on empty cars! Unfortunately that isn't free.",
      zh: '如果能在空车厢上装上致命的加特林机枪，铁路就会成为我们最强大的武器！可惜，这可不便宜。',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_04_02',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'The most low-down characters frequent the saloon. If we run out of fighters out here, we can surely get some replacements in there!',
      zh: '酒馆里总有些最不入流的家伙。要是外面的战士不够了，我们肯定能从那里招些替补！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_04_03',
    speaker: { en: 'Engineer', zh: '工程师' },
    text: {
      en: 'If the settlers had taken the railroad, it would have been much quicker!',
      zh: '要是拓荒者乘铁路来，就快多了！',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_04_04',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "Why didn't we take the railroad? It would have been much quicker!",
      zh: '我们为什么不走铁路？那样肯定快多了！',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_04_05',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "We spotted some settlers in the South. Don't let them slip past us!",
      zh: '我们发现南边有些拓荒者。别让他们溜过去！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_04_06',
    speaker: { en: 'Settlers', zh: '拓荒者' },
    text: {
      en: "Gold! Gold! We found gold! Let's take this treasure with us. Nothing will happen to us.",
      zh: '黄金！黄金！我们找到黄金了！把财宝带上吧，不会出事的。',
    },
    portraitAsset: 'portrait_settlers',
    voiceSound: 'sound_siedler',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_04_07',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: 'Hee hee hee! How nice of you to offer the gold up to us on a silver platter!',
      zh: '嘿嘿嘿！你们真客气，竟把黄金拱手送到我们面前！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_04_08',
    speaker: { en: 'Pedro', zh: '佩德罗' },
    text: {
      en: "The last settlers are coming up ahead. We'll set a trap for them that they'll never forget. Hee hee hee!",
      zh: '最后一批拓荒者就在前面。我们要给他们设个永生难忘的陷阱。嘿嘿嘿！',
    },
    portraitAsset: 'portrait_pedro',
    voiceSound: 'sound_pedro',
  },
];

export const techTownWaveIntros: readonly TechTownWaveIntro[] = Object.freeze(
  intros.map((intro) => Object.freeze(intro)),
);
