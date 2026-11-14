import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon07DialogueResource =
  | 'T_CAMPAIGN_27_01'
  | 'T_CAMPAIGN_27_02'
  | 'T_CAMPAIGN_27_03'
  | 'T_CAMPAIGN_27_04'
  | 'T_CAMPAIGN_27_05'
  | 'T_CAMPAIGN_27_06'
  | 'T_CAMPAIGN_27_07'
  | 'T_CAMPAIGN_27_08'
  | 'T_CAMPAIGN_27_09'
  | 'T_CAMPAIGN_27_10';

export interface Oregon07WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon07DialogueResource;
}

const dynamite: LocalizedCampaignCopy = Object.freeze({ en: 'Dynamite', zh: '炸药专家' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '原住民' });
const engineer: LocalizedCampaignCopy = Object.freeze({ en: 'Engineer', zh: '工程师' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK English dialogue and portrait resources; Chinese is translated and voice is not inferred. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_27_01',
    speaker: dynamite,
    text: {
      en: 'Hey, Boss, we buried a lot of dynamite again, at the base of Mount Hood!',
      zh: '老板，我们又在胡德山脚下埋了不少炸药！',
    },
    portraitAsset: 'oregon_dakota_portrait_dynamite',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_27_02',
    speaker: indian,
    text: {
      en: "That Wy'east! When we are no more, all culture is buried, too!",
      zh: '那可是 Wy\'east 山！等我们不在了，所有文化也都会被埋葬！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_27_03',
    speaker: engineer,
    text: {
      en: "My train is never late, settlers! Come on, get on board, I'll show you the area… From below!",
      zh: '我的火车从不晚点，拓荒者们！上车吧，我带你们从地下看看这片区域！',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_27_04',
    speaker: geezer,
    text: {
      en: 'I hear something whistling, maybe my tea is done?',
      zh: '我听到什么东西在鸣响，可能是我的茶煮好了？',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_27_05',
    speaker: gunslinger,
    text: {
      en: "Pa, that's the Oregon Express! Maybe you should look for the sleeping car!",
      zh: '爸，那是俄勒冈特快列车！你或许该去找卧铺车厢！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_27_06',
    speaker: geezer,
    text: {
      en: "What? You wanna sleep? Bah, I'll take care of those lazy walkers!",
      zh: '什么？你想睡觉？哼，我来收拾那些慢吞吞步行的人！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_27_07',
    speaker: mexican,
    text: {
      en: 'Ay, caramba! Here come some gringos from the north-east!',
      zh: '哎呀！东北方向来了一群美国佬！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_27_08',
    speaker: engineer,
    text: {
      en: 'The settlers must be cold here in the mountains! Get the Gatling guns and warm them up!',
      zh: '山里的拓荒者肯定冻坏了！拿上加特林机枪，给他们暖暖身子！',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_27_09',
    speaker: pedro,
    text: {
      en: "Wow, here come so many settlers, we won't be able to carry all that gold!",
      zh: '哇，这么多拓荒者来了，我们都快搬不动这么多金子了！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_27_10',
    speaker: boss,
    text: {
      en: "I'm sure you robbed enough for today, just let me pass! I'll even offer you a piece of copper!",
      zh: '我想你们今天抢得够多了，放我过去吧！我甚至可以给你们一块铜！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon07WaveIntro[];

export const oregon07WaveIntros: readonly Oregon07WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Portraits join the game's initial image preload, before the corresponding dialogue opens. */
export const oregon07CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon07WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
