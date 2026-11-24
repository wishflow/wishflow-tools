import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota10DialogueResource =
  | 'T_CAMPAIGN_40_01'
  | 'T_CAMPAIGN_40_02'
  | 'T_CAMPAIGN_40_03'
  | 'T_CAMPAIGN_40_04'
  | 'T_CAMPAIGN_40_05'
  | 'T_CAMPAIGN_40_06'
  | 'T_CAMPAIGN_40_07'
  | 'T_CAMPAIGN_40_08'
  | 'T_CAMPAIGN_40_09'
  | 'T_CAMPAIGN_40_10';

export interface Dakota10WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota10DialogueResource;
}

const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const calamity: LocalizedCampaignCopy = Object.freeze({ en: 'Calamity', zh: '卡拉米蒂' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Geezer', zh: '达科他老爷子' });
const captain: LocalizedCampaignCopy = Object.freeze({ en: 'Captain', zh: '船长' });
const engineer: LocalizedCampaignCopy = Object.freeze({ en: 'Engineer', zh: '工程师' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '原住民' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Boss', zh: '达科他头目' });

/** APK T_CAMPAIGN_40_01–10 English text and portrait IDs with site-localized Chinese. */
const waveIntros: Dakota10WaveIntro[] = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_40_01',
    speaker: pedro,
    text: {
      en: '"It\'s very wet here, Boss! Can we do some cliff diving later?"',
      zh: '“这儿好潮湿啊，老板！等会儿我们能去玩悬崖跳水吗？”',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_40_02',
    speaker: calamity,
    text: {
      en: '"You want to jump off the cliff? Go ahead! I won\'t stop you!"',
      zh: '“你想跳下悬崖？尽管去吧！我才不拦你呢！”',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_40_03',
    speaker: gunslinger,
    text: {
      en: 'Sweetheart, I bet you just want to admire our muscular torsos when we jump off the cliffs!',
      zh: '亲爱的，我敢打赌，你只是想在我们跳下悬崖时欣赏我们的健美身材！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_40_04',
    speaker: calamity,
    text: {
      en: 'Sure… Especially when your torsos hit the rocks down there!',
      zh: '当然……尤其是看着你们摔到下面的岩石上！',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_40_05',
    speaker: geezer,
    text: {
      en: 'Rocks? What rocks? I thought we were looking for gold!',
      zh: '岩石？什么岩石？我还以为我们是来找金子的！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_40_06',
    speaker: captain,
    text: {
      en: 'Settlers ahead in the south-west! Load the cannons!',
      zh: '西南方向发现拓荒者！装填大炮！',
    },
    portraitAsset: 'portrait_captain',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_40_07',
    speaker: engineer,
    text: {
      en: '"It\'s full of settlers here! Maybe I should go straight and get paid for driving passengers with my train!"',
      zh: '“这里到处都是拓荒者！也许我该直行，用火车载客赚钱！”',
    },
    portraitAsset: 'portrait_engineer',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_40_08',
    speaker: calamity,
    text: {
      en: '"You want to go straight? Go ahead! Then I can rob you after the end of every working day, and we\'re all happy!"',
      zh: '“你想直行？去吧！这样我每天收工后都能抢你的钱，大家都开心！”',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_40_09',
    speaker: indian,
    text: {
      en: 'Dakota, gather for the final battle!',
      zh: '达科他族的勇士们，集合，迎接最后一战！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_40_10',
    speaker: boss,
    text: {
      en: '"Bunch of scoundrels, you\'ll never get me! Dakota will never be yours! This is all nationalized!"',
      zh: '“你们这群恶棍，休想抓到我！达科他永远不会属于你们！这里的一切都已国有化！”',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
];

export const dakota10WaveIntros: readonly Dakota10WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota10CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota10WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
