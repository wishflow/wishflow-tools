import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type BombingtonDialogueResource =
  | 'T_CAMPAIGN_42_1'
  | 'T_CAMPAIGN_42_2'
  | 'T_CAMPAIGN_42_3'
  | 'T_CAMPAIGN_42_4'
  | 'T_CAMPAIGN_42_5'
  | 'T_CAMPAIGN_42_6'
  | 'T_CAMPAIGN_42_7'
  | 'T_CAMPAIGN_42_8'
  | 'T_CAMPAIGN_42_9'
  | 'T_CAMPAIGN_42_10';

export interface BombingtonWaveIntro extends CampaignWaveIntro {
  dialogueResource: BombingtonDialogueResource;
}

const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const pyromaniac: LocalizedCampaignCopy = Object.freeze({ en: 'Pyromaniac', zh: '纵火狂' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const deserter: LocalizedCampaignCopy = Object.freeze({ en: 'Deserter', zh: '逃兵' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Boss', zh: '头目' });

/** APK English text and portraits; Chinese lines are project translations. */
const waveIntros: BombingtonWaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_42_1',
    speaker: mexican,
    text: { en: 'Ay caramba! I like it here! Explosions and plenty horchata drinks!', zh: '哎呀！我喜欢这里！有爆炸，还有喝不完的欧洽塔！' },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_42_2',
    speaker: pyromaniac,
    text: { en: 'Explosions, we need more explosions!', zh: '爆炸！我们需要更多爆炸！' },
    portraitAsset: 'portrait_pyromaniac',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_42_3',
    speaker: pyromaniac,
    text: {
      en: 'More settlers are coming, and one by one they are finding all the entrances to Bombington.',
      zh: '更多拓荒者来了，他们正陆续找到通往炸弹镇的所有入口。',
    },
    portraitAsset: 'portrait_pyromaniac',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_42_4',
    speaker: pyromaniac,
    text: {
      en: "Don't worry, my rockets can even reach those settlers in the south-east.",
      zh: '别担心，我的火箭连东南边的那些拓荒者都能打到。',
    },
    portraitAsset: 'portrait_pyromaniac',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_42_5',
    speaker: gunslinger,
    text: { en: "More settlers! Nothing my gun couldn't handle, yeehaw!", zh: '又来拓荒者了！没什么是我的枪搞不定的，耶哈！' },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_42_6',
    speaker: pedro,
    text: {
      en: 'They have found the last remaining passage in the south. Prepare the dynamite!',
      zh: '他们找到南边最后一条通道了。准备好炸药！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_42_7',
    speaker: mexican,
    text: { en: 'Oh my god, I love this region! So many explosions and so much gold!', zh: '我的天，我太喜欢这片地方了！爆炸这么多，金子也这么多！' },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_42_8',
    speaker: deserter,
    text: { en: 'Load the cannons, the gold wagons are coming!', zh: '装填大炮，运金马车要来了！' },
    portraitAsset: 'portrait_deserter',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_42_9',
    speaker: pedro,
    text: { en: 'Great, one more group and we are almost done here!', zh: '太好了，再来一群，我们就快搞定了！' },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_42_10',
    speaker: boss,
    text: {
      en: "You won't get my gold! I've survived worse things than this.",
      zh: '你们别想拿走我的金子！比这更糟的情况我都挺过来了。',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const bombingtonWaveIntros: readonly BombingtonWaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const bombingtonCampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(bombingtonWaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
