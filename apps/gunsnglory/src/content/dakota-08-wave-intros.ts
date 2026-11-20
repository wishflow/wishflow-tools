import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota08DialogueResource =
  | 'T_CAMPAIGN_38_01'
  | 'T_CAMPAIGN_38_02'
  | 'T_CAMPAIGN_38_03'
  | 'T_CAMPAIGN_38_04'
  | 'T_CAMPAIGN_38_05'
  | 'T_CAMPAIGN_38_06'
  | 'T_CAMPAIGN_38_07'
  | 'T_CAMPAIGN_38_08';

export interface Dakota08WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota08DialogueResource;
}

const captain: LocalizedCampaignCopy = Object.freeze({ en: 'Captain', zh: '船长' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const settlers: LocalizedCampaignCopy = Object.freeze({ en: 'Settlers', zh: '拓荒者' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Geezer', zh: '达科他老爷子' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Boss', zh: '达科他头目' });

/** APK resource IDs, English dialogue and portraits; Chinese text is translated for the web. */
const waveIntros: Dakota08WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_38_01',
    speaker: captain,
    text: {
      en: "There's a beautiful view on this rough sea! Show me some settlers and I'll make my calliopes glow!",
      zh: '这片波涛汹涌的海景真美！给我找些拓荒者来，我要让蒸汽风琴响起来！',
    },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_38_02',
    speaker: pedro,
    text: {
      en: "You're talking about a rough sea, when your ship ran aground in a small pond?",
      zh: '你说这是波涛汹涌的大海？你的船却搁浅在一个小池塘里？',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_38_03',
    speaker: mexican,
    text: {
      en: 'Here come some guests from the north-east! I bet they want to splash around in our pond!',
      zh: '东北方向来客人了！我敢说他们也想在我们的池塘里玩水！',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_38_04',
    speaker: settlers,
    text: {
      en: 'Honey, look! There\'s a swimming pool ahead! Just for us!',
      zh: '亲爱的，看！前面有个游泳池，而且是专门给我们准备的！',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_38_05',
    speaker: geezer,
    text: {
      en: 'Hm, those female settlers from the west get more beautiful every day! Well, well, If I only was younger…',
      zh: '嗯，西边来的那些女拓荒者一天比一天漂亮。唉，要是我年轻些就好了……',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_38_06',
    speaker: geezer,
    text: {
      en: 'When you still were young, Pa, the grandmothers of those settlers weren\'t even born!',
      zh: '爸，你年轻的时候，那些拓荒者的奶奶还没出生呢！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_38_07',
    speaker: gunslinger,
    text: {
      en: 'Sailors, load the cannons! We have visitors from all directions!',
      zh: '水手们，装填火炮！各个方向都有客人来了！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_38_08',
    speaker: boss,
    text: {
      en: 'Go on with your swim, bandits, I\'ll hightail out of here in the meantime!',
      zh: '强盗们，你们继续游泳，我趁机溜之大吉！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const dakota08WaveIntros: readonly Dakota08WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota08CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota08WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
