import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon10DialogueResource =
  | 'T_CAMPAIGN_30_01'
  | 'T_CAMPAIGN_30_02'
  | 'T_CAMPAIGN_30_03'
  | 'T_CAMPAIGN_30_04'
  | 'T_CAMPAIGN_30_05'
  | 'T_CAMPAIGN_30_06'
  | 'T_CAMPAIGN_30_07'
  | 'T_CAMPAIGN_30_08'
  | 'T_CAMPAIGN_30_09'
  | 'T_CAMPAIGN_30_10';

export interface Oregon10WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon10DialogueResource;
}

const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const engineer: LocalizedCampaignCopy = Object.freeze({ en: 'Engineer', zh: '工程师' });
const deserter: LocalizedCampaignCopy = Object.freeze({ en: 'Deserter', zh: '逃兵' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '印第安人' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK English text, resource IDs, and portraits; Chinese is local translation with no inferred voice. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_30_01',
    speaker: geezer,
    text: {
      en: '"Boys, it\'s wonderful that you cut down all those trees here! Finally, I can see!"',
      zh: '“伙计们，你们把这里的树都砍掉真是太好了！我终于能看见了！”',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_30_02',
    speaker: gunslinger,
    text: {
      en: 'Ouch! You hit my backside, Pa!',
      zh: '哎哟！你打到我的屁股了，爸爸！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_30_03',
    speaker: engineer,
    text: {
      en: '"I see some travelers in the south! Let\'s advertise our railway line!"',
      zh: '“我看见南边有些旅人！让我们给铁路线路打打广告吧！”',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_30_04',
    speaker: deserter,
    text: {
      en: 'Sir, should we continue shooting at trees or can we start aiming at the settlers?',
      zh: '先生，我们还要继续射树，还是可以开始瞄准拓荒者了？',
    },
    portraitAsset: 'portrait_deserter',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_30_05',
    speaker: mexican,
    text: {
      en: 'Ayayay, I see gringos in the northern valley! Send us some troops!',
      zh: '哎呀呀，我看见北边山谷里有些美国佬！派些人来支援我们！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_30_06',
    speaker: indian,
    text: {
      en: '"You won\'t take our wood!"',
      zh: '“你们休想拿走我们的木材！”',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_30_07',
    speaker: geezer,
    text: {
      en: 'Take cover behind the tree stumps!',
      zh: '躲到树桩后面！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_30_08',
    speaker: gunslinger,
    text: {
      en: 'Cover? What for, Pa? Do you want to shoot at us or at the defenseless settlers in both valleys?',
      zh: '掩护？为什么，爸爸？你是想打我们，还是想打两个山谷里那些毫无防备的拓荒者？',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_30_09',
    speaker: geezer,
    text: {
      en: '"I just want you to train bushwhacking! Otherwise, the settlers might not rush so blindly through the valleys again!"',
      zh: '“我只是想训练你们打伏击！不然拓荒者下次就不会再这么盲目地冲过山谷了！”',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_30_10',
    speaker: boss,
    text: {
      en: 'Those damned savages! We should spread out and pass that valley quickly!',
      zh: '那些该死的野蛮人！我们应该分散开，尽快通过那个山谷！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon10WaveIntro[];

export const oregon10WaveIntros: readonly Oregon10WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Portraits are decoded with the initial game assets, before the corresponding wave opens. */
export const oregon10CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon10WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
