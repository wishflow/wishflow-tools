import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon01DialogueResource =
  | 'T_CAMPAIGN_21_01'
  | 'T_CAMPAIGN_21_02'
  | 'T_CAMPAIGN_21_03'
  | 'T_CAMPAIGN_21_04'
  | 'T_CAMPAIGN_21_05'
  | 'T_CAMPAIGN_21_06'
  | 'T_CAMPAIGN_21_07'
  | 'T_CAMPAIGN_21_08';

export interface Oregon01WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon01DialogueResource;
}

const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Geezer', zh: '老爷子' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });

/** APK English dialogue and portraits; Chinese text is a project translation, with no inferred voice cues. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_21_01',
    speaker: pedro,
    text: {
      en: "Hey, Boss! It was a good idea to vacation at Oregon Trail! Just relaxing and picking settlers' pockets for gold! Ay, caramba!",
      zh: '老板！来俄勒冈小道度假真是个好主意！放松放松，顺手从拓荒者口袋里掏点金币！哎呀，真带劲！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_21_02',
    speaker: geezer,
    text: {
      en: "Pickpocketing a colt from settlers? Bah, I'll keep to my good old scattergun! It stuns butts and legs!",
      zh: '从拓荒者那里顺走一把柯尔特？哼，我还是用老伙计散弹枪吧！它能把屁股和腿都打麻！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_21_03',
    speaker: geezer,
    text: {
      en: "Grrr, I hate those smelly horses and modern stagecoaches! Let's see what my pepper volleys can do here!",
      zh: '呃，我讨厌那些臭烘烘的马和现代驿马车！看看我的胡椒弹齐射在这里能派上什么用场！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_21_04',
    speaker: pedro,
    text: {
      en: 'Hey, old man, just let us deal with the horses and coaches! You can take on the settlers that are coming from the south on foot!',
      zh: '老头，马和马车交给我们对付！你负责应付从南边徒步过来的拓荒者！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_21_05',
    speaker: geezer,
    text: {
      en: "Screw you! Are those trees or settlers? You know, my eyes aren't as young as they used to be! Whatever, I'll shoot it!",
      zh: '去你的！那些到底是树还是拓荒者？你知道，我这双老眼睛可不如从前了！管他呢，我开枪就是！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_21_06',
    speaker: { en: 'Mexican', zh: '墨西哥人' },
    text: {
      en: "We'll be rich! They're coming from everywhere! Arriba! Arriba! Ándale!",
      zh: '我们要发财了！他们从四面八方涌来！Arriba！Arriba！Ándale！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_21_07',
    speaker: { en: 'Gunslinger', zh: '枪手' },
    text: {
      en: 'Yeehah! Make your Colts smoke, men!',
      zh: '耶哈！弟兄们，让你们的柯尔特手枪冒烟吧！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_21_08',
    speaker: pedro,
    text: {
      en: "Boss, the Sheriff's on his way! We should get out of here, with the gold from these last settlers!",
      zh: '老板，警长快到了！我们得带着这最后一批拓荒者的黄金赶紧离开！',
    },
    portraitAsset: 'portrait_pedro',
  },
] satisfies Oregon01WaveIntro[];

export const oregon01WaveIntros: readonly Oregon01WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);
