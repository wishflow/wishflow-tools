import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota02DialogueResource =
  | 'T_CAMPAIGN_32_01'
  | 'T_CAMPAIGN_32_02'
  | 'T_CAMPAIGN_32_03'
  | 'T_CAMPAIGN_32_04'
  | 'T_CAMPAIGN_32_05'
  | 'T_CAMPAIGN_32_06'
  | 'T_CAMPAIGN_32_07'
  | 'T_CAMPAIGN_32_08';

export type Dakota02WaveIntro = Omit<CampaignWaveIntro, 'portraitAsset'> & {
  dialogueResource: Dakota02DialogueResource;
  portraitAsset: CampaignWaveIntro['portraitAsset'] | 'oregon_dakota_portrait_calamity' | 'oregon_dakota_portrait_boss';
};

const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '印第安人' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const calamity: LocalizedCampaignCopy = Object.freeze({ en: 'Calamity', zh: '卡拉米蒂' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK English dialogue and portrait resources; Chinese text is a local translation. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_32_01',
    speaker: indian,
    text: {
      en: 'Our ancestors called this mountain Six Grandfathers. From a distance, its shape looks like a collection of giant heads!',
      zh: '我们的祖先称这座山为六祖山。从远处看，它就像一群巨大的头像！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_32_02',
    speaker: gunslinger,
    text: {
      en: "You're right, the mountain is staring at me!",
      zh: '你说得对，那座山正盯着我看呢！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_32_03',
    speaker: mexican,
    text: {
      en: 'With enough dynamite, I could sculpt this rock so that it shows our own faces!',
      zh: '只要有足够的炸药，我就能把这块岩石雕成我们的脸！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_32_04',
    speaker: pedro,
    text: {
      en: 'Nobody wants to see your face!',
      zh: '没人想看到你的脸！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_32_05',
    speaker: calamity,
    text: {
      en: 'Men and their vanity! You better save up your dynamite for those settlers!',
      zh: '男人总是这么自恋！你们最好把炸药留给那些拓荒者！',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_32_06',
    speaker: geezer,
    text: {
      en: 'I see dark shadows in the north! Gotta be a cloudburst!',
      zh: '我看见北边有大片乌云！一定是暴雨要来了！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_32_07',
    speaker: gunslinger,
    text: {
      en: 'Pa, I told you thousand times: take your glasses along when you\'re hunting settlers!',
      zh: '爸，我都跟你说过一千遍了：去追拓荒者时要带上眼镜！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_32_08',
    speaker: boss,
    text: {
      en: 'Hahaha! Seedy bunch of bandits! You can\'t harm me when I have this bullet- and dynamite-proof vest!',
      zh: '哈哈哈！一群不入流的匪徒！有这件防弹又防炸药的背心，你们伤不了我！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Dakota02WaveIntro[];

export const dakota02WaveIntros: readonly Dakota02WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota02CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota02WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
