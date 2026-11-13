import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon05DialogueResource =
  | 'T_CAMPAIGN_25_01'
  | 'T_CAMPAIGN_25_02'
  | 'T_CAMPAIGN_25_03'
  | 'T_CAMPAIGN_25_04'
  | 'T_CAMPAIGN_25_05'
  | 'T_CAMPAIGN_25_06'
  | 'T_CAMPAIGN_25_07'
  | 'T_CAMPAIGN_25_08'
  | 'T_CAMPAIGN_25_09';

export interface Oregon05WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon05DialogueResource;
}

const dynamite: LocalizedCampaignCopy = Object.freeze({ en: 'Dynamite', zh: '爆破手' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK dialogue and portrait references; Chinese text is translated and no voice route is inferred. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_25_01',
    speaker: dynamite,
    text: {
      en: 'Good morning, Boss! While you had a siesta, we prepared this valley with some mines! You just have to tap the trigger at the right moment and KABOOM!',
      zh: '早上好，老板！趁您午睡的时候，我们在这座山谷里埋好了地雷！您只需在合适的时候按下触发器，然后——轰！',
    },
    portraitAsset: 'oregon_dakota_portrait_dynamite',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_25_02',
    speaker: dynamite,
    text: {
      en: 'Now that was a big bang! We even buried some more dynamite at the same spot! You just have to wait for the sun to heat up the wires!',
      zh: '刚才那声可真响！我们还在同一个地方埋了更多炸药！只要等太阳把导线晒热就行了！',
    },
    portraitAsset: 'oregon_dakota_portrait_dynamite',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_25_03',
    speaker: pedro,
    text: {
      en: 'The noise seems to have woken up the settlers and the Sheriff! We should hurry up and get some help!',
      zh: '这动静好像惊醒了拓荒者和警长！我们得赶紧找些帮手！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_25_04',
    speaker: geezer,
    text: {
      en: 'Noise? What noise? I didn\'t hear anything!',
      zh: '动静？什么动静？我什么都没听见！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_25_05',
    speaker: mexican,
    text: {
      en: 'Boss, here come the most beautiful wagons I have ever seen! Look at how they sparkle!',
      zh: '老板，我从没见过这么漂亮的篷车！瞧它们多闪亮！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_25_06',
    speaker: gunslinger,
    text: {
      en: 'Anybody order some gold? The Pony Express is on its way!',
      zh: '有人订了金子吗？小马快递马上就到！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_25_07',
    speaker: geezer,
    text: {
      en: 'Wait, I hear some footsteps! This must be a lot of settlers, all on foot! Let me polish my gun!',
      zh: '等等，我听见脚步声了！一定是很多拓荒者正徒步赶来！让我擦亮枪管！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_25_08',
    speaker: gunslinger,
    text: {
      en: 'You hear footsteps but no explosions, old man? Maybe you should visit the doc and have a check-up!',
      zh: '你听见脚步声，却没听见爆炸？老头，你该去找医生检查一下了！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_25_09',
    speaker: boss,
    text: {
      en: 'Who asked for me? Let me through, I\'m a doctor!',
      zh: '是谁找我？让开，我是医生！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon05WaveIntro[];

export const oregon05WaveIntros: readonly Oregon05WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Dialogue portraits are included in the existing game-start image preload. */
export const oregon05CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon05WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
