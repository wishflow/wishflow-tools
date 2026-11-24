import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota09DialogueResource =
  | 'T_CAMPAIGN_39_01'
  | 'T_CAMPAIGN_39_02'
  | 'T_CAMPAIGN_39_03'
  | 'T_CAMPAIGN_39_04'
  | 'T_CAMPAIGN_39_05'
  | 'T_CAMPAIGN_39_06'
  | 'T_CAMPAIGN_39_07'
  | 'T_CAMPAIGN_39_08';

export interface Dakota09WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota09DialogueResource;
}

const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Geezer', zh: '达科他老爷子' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const calamity: LocalizedCampaignCopy = Object.freeze({ en: 'Calamity', zh: '卡拉米蒂' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '印第安人' });
const settlers: LocalizedCampaignCopy = Object.freeze({ en: 'Settlers', zh: '拓荒者' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Boss', zh: '达科他头目' });

/** APK dialogue keys, verbatim English strings, and portrait drawables for global level 39. */
const waveIntros: Dakota09WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_39_01',
    speaker: geezer,
    text: {
      en: '"I just don\'t get it, is it Christmas day? Snow, trees and I see some elves up ahead!"',
      zh: '“我真搞不懂——今天是圣诞节吗？有雪、有树，我还看见前面有精灵！”',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_39_02',
    speaker: gunslinger,
    text: {
      en: '"Those aren\'t elves, old man! But you\'re right, they do have some presents with them!"',
      zh: '“那才不是精灵呢，老头！不过你说得对，他们确实带着礼物！”',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_39_03',
    speaker: calamity,
    text: {
      en: 'The only thing that has to do anything to do with Christmas here is your snowbound mind!',
      zh: '这里唯一跟圣诞节沾边的，就是你那被雪冻住的脑子！',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_39_04',
    speaker: pedro,
    text: {
      en: 'Why are you always so uptight, señorita? You remind me of the story about that green grouch…',
      zh: '你怎么总这么紧张，小姐？你让我想起那个绿色怪人的故事……',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_39_05',
    speaker: indian,
    text: {
      en: 'Why are palefaces always babbling? My tribe prefers to deal with more important things, like the palefaces in the west!',
      zh: '白脸人怎么总爱唠叨？我们部族有更要紧的事，比如西边那些白脸人！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_39_06',
    speaker: settlers,
    text: {
      en: '"Honey, don\'t you think it looks very festive here? Look, there\'s even a Christmas star flying towards us…"',
      zh: '“亲爱的，你不觉得这里很有节日气氛吗？看，连圣诞星都朝我们飞来了……”',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_39_07',
    speaker: gunslinger,
    text: {
      en: 'Here comes Santa Claus with his wagons full of presents!',
      zh: '圣诞老人来啦，他的马车装满了礼物！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_39_08',
    speaker: boss,
    text: {
      en: '"Eh… Hohoho, let me pass, I\'m… Santa Claus! You have to believe me!"',
      zh: '“呃……呵呵呵，让我过去，我是……圣诞老人！你们得相信我！”',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const dakota09WaveIntros: readonly Dakota09WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota09CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota09WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
