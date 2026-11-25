import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Nevada01DialogueResource =
  | 'T_CAMPAIGN_41_1'
  | 'T_CAMPAIGN_41_2'
  | 'T_CAMPAIGN_41_3'
  | 'T_CAMPAIGN_41_4'
  | 'T_CAMPAIGN_41_5'
  | 'T_CAMPAIGN_41_6'
  | 'T_CAMPAIGN_41_7'
  | 'T_CAMPAIGN_41_8'
  | 'T_CAMPAIGN_41_9'
  | 'T_CAMPAIGN_41_10'
  | 'T_CAMPAIGN_41_11';

export interface Nevada01WaveIntro extends CampaignWaveIntro {
  dialogueResource: Nevada01DialogueResource;
}

const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const pyromaniac: LocalizedCampaignCopy = Object.freeze({ en: 'Pyromaniac', zh: '纵火狂' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Boss', zh: '头目' });

/** APK English dialogue and portrait references; Chinese text is a local translation. */
const waveIntros: Nevada01WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_41_1',
    speaker: pedro,
    text: { en: 'This place reminds me of home.', zh: '这地方让我想起家乡。' },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_41_2',
    speaker: gunslinger,
    text: { en: 'Did you get lost down there in the canyons, boss?', zh: '老板，你是不是在下面的峡谷里迷路了？' },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_41_3',
    speaker: pedro,
    text: { en: 'No, and now focus on the settlers in the north.', zh: '没有。现在专心对付北边的拓荒者。' },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_41_4',
    speaker: pyromaniac,
    text: { en: "Don't worry, I'll make them see more stars than they care for.", zh: '别担心，我会让他们眼冒金星，数都数不过来。' },
    portraitAsset: 'portrait_pyromaniac',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_41_5',
    speaker: pyromaniac,
    text: { en: 'More firework and more settlers coming from all directions. Great!', zh: '更多烟花，还有从四面八方赶来的拓荒者。好极了！' },
    portraitAsset: 'portrait_pyromaniac',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_41_6',
    speaker: pedro,
    text: { en: 'Nice shots! You got some real talent for robbery. Wanna join us?', zh: '枪法不错！你抢劫很有天赋。要加入我们吗？' },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_41_7',
    speaker: pyromaniac,
    text: { en: 'More money for fireworks and blowing up stuff? What more could I wish for.', zh: '还有钱买烟花、炸东西？我还能奢求什么呢。' },
    portraitAsset: 'portrait_pyromaniac',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_41_8',
    speaker: mexican,
    text: { en: "Just don't touch my dynamite, I wanna use it to blow up those gold wagons.", zh: '别碰我的炸药，我要用它炸掉那些运金子的马车。' },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_41_9',
    speaker: pyromaniac,
    text: { en: "Don't worry, I have my own rockets. They just arrived from China.", zh: '别担心，我有自己的火箭。它们刚从中国运来。' },
    portraitAsset: 'portrait_pyromaniac',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_41_10',
    speaker: pedro,
    text: { en: "One more group and we're finished here. Prepare the fireworks!", zh: '再来一队，我们就完事了。准备放烟花！' },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 11,
    dialogueResource: 'T_CAMPAIGN_41_11',
    speaker: boss,
    text: { en: 'Let them enjoy their fireworks. Quickly, move through the canyon before they notice us.', zh: '让他们欣赏烟花。快，趁他们还没发现我们，穿过峡谷。' },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const nevada01WaveIntros: readonly Nevada01WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const nevada01CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(nevada01WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
