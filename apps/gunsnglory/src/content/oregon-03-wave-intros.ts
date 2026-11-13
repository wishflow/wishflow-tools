import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon03DialogueResource =
  | 'T_CAMPAIGN_23_01'
  | 'T_CAMPAIGN_23_02'
  | 'T_CAMPAIGN_23_03'
  | 'T_CAMPAIGN_23_04'
  | 'T_CAMPAIGN_23_05'
  | 'T_CAMPAIGN_23_06'
  | 'T_CAMPAIGN_23_07'
  | 'T_CAMPAIGN_23_08'
  | 'T_CAMPAIGN_23_09';

export interface Oregon03WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon03DialogueResource;
}

const settlers: LocalizedCampaignCopy = Object.freeze({ en: 'Settlers', zh: '拓荒者' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '原住民' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK English dialogue and portraits; Chinese is translated, with no inferred voice routes. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_23_01',
    speaker: settlers,
    text: {
      en: 'Honey, I heard that some wild animals live here! Hold me tight!',
      zh: '亲爱的，我听说这里住着些野兽！抱紧我！',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_23_02',
    speaker: settlers,
    text: {
      en: 'Don\'t be afraid, the covered wagons will protect us against their evil eyes!',
      zh: '别害怕，篷车会保护我们，不让那些邪恶的眼睛伤害我们！',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_23_03',
    speaker: gunslinger,
    text: {
      en: 'No respect, those settlers! The Chinook are natives, not animals! But I see some settler cows in the north!',
      zh: '这些拓荒者真不尊重人！奇努克人是原住民，不是动物！不过我看见北边有几头拓荒者的牛！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_23_04',
    speaker: geezer,
    text: {
      en: 'Huh, what? North? Damn, I thought this is the west!',
      zh: '咦，什么？北边？该死，我还以为这边是西边！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_23_05',
    speaker: gunslinger,
    text: {
      en: 'Pa, maybe you shouldn\'t drink so much fire-water! Just deal with the settlers from the south-east!',
      zh: '爸，你也许不该喝那么多烈酒！去对付东南边的拓荒者就好！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_23_06',
    speaker: indian,
    text: {
      en: 'We heard someone wants to smoke our salmon? Let\'s dig up the hatchet!',
      zh: '我们听说有人想熏我们的鲑鱼？抄起战斧！',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_23_07',
    speaker: gunslinger,
    text: {
      en: 'The only thing smoking will be my Colts, yeeehah!',
      zh: '会冒烟的只有我的柯尔特手枪，耶哈！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_23_08',
    speaker: pedro,
    text: {
      en: 'Here comes the cavalry! Set them on fire and steal their gold teeth!',
      zh: '骑兵来了！把他们点着，再把他们的金牙偷走！',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_23_09',
    speaker: boss,
    text: {
      en: 'Damned bandits! I\'m not afraid of you! My golden vest will protect me!',
      zh: '该死的土匪！我才不怕你们！我的金背心会保护我！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon03WaveIntro[];

export const oregon03WaveIntros: readonly Oregon03WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Portraits are part of game startup preloading, even before the first dialogue opens. */
export const oregon03CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon03WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
