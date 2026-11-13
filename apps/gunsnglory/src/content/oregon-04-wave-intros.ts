import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon04DialogueResource =
  | 'T_CAMPAIGN_24_01'
  | 'T_CAMPAIGN_24_02'
  | 'T_CAMPAIGN_24_03'
  | 'T_CAMPAIGN_24_04'
  | 'T_CAMPAIGN_24_05'
  | 'T_CAMPAIGN_24_06'
  | 'T_CAMPAIGN_24_07'
  | 'T_CAMPAIGN_24_08'
  | 'T_CAMPAIGN_24_09'
  | 'T_CAMPAIGN_24_10';

export interface Oregon04WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon04DialogueResource;
}

const deserter: LocalizedCampaignCopy = Object.freeze({ en: 'Deserter', zh: '逃兵' });
const settlers: LocalizedCampaignCopy = Object.freeze({ en: 'Settlers', zh: '拓荒者' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '原住民' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK resource IDs, English dialogue and portrait IDs; speaker labels follow portrait identity, with no voice mapping. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_24_01',
    speaker: deserter,
    text: {
      en: "Sir, the cannons of Fort Echo are ready to fire! We're waiting for your orders… orders… orders…",
      zh: '长官，回声堡的加农炮已经准备开火！我们正等候您的命令……命令……命令……',
    },
    portraitAsset: 'portrait_deserter',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_24_02',
    speaker: settlers,
    text: {
      en: "Honey, we should have taken a map with us! We' ll never find a way out of here… here… here…",
      zh: '亲爱的，我们真该带张地图！我们永远也找不到出路了……路……路……',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_24_03',
    speaker: settlers,
    text: {
      en: 'Fiddlesticks! A map just costs gold! You should trust my instincts! I know the way… way… way…',
      zh: '胡说八道！地图可要花钱！你该相信我的直觉！我知道路怎么走……走……走……',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_24_04',
    speaker: geezer,
    text: {
      en: 'Hell, my back hurts from all this valley bending… bending… bending…',
      zh: '见鬼，这一路在峡谷里弯来绕去，背都疼了……绕来绕去……绕来绕去……',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_24_05',
    speaker: indian,
    text: {
      en: 'Old man should drink more fire-water! Wakes up the spirits and burns down the enemy! …enemy… enemy…',
      zh: '老头该多喝点烈酒！既能提振精神，还能把敌人烧个精光！……敌人……敌人……',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_24_06',
    speaker: mexican,
    text: {
      en: "Ay, those settlers breed like the flies on Pedro's back! …back…back…",
      zh: '哎呀，那些拓荒者繁殖得跟佩德罗背上的苍蝇一样快！……背上……背上……',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_24_07',
    speaker: pedro,
    text: {
      en: "Boss, now they're trying in the south-east! …east… east…",
      zh: '头儿，他们现在正试图从东南边突破！……东边……东边……',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_24_08',
    speaker: geezer,
    text: {
      en: "Upon my soul, they're everywhere! My legs won't play along anymore… more… more…",
      zh: '看在老天爷的份上，他们到处都是！我的腿已经不听使唤了……了……了……',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_24_09',
    speaker: deserter,
    text: {
      en: 'Sir, we need more guns! …guns… guns…',
      zh: '长官，我们需要更多枪炮！……枪炮……枪炮……',
    },
    portraitAsset: 'portrait_deserter',
  },
  {
    waveNumber: 10,
    dialogueResource: 'T_CAMPAIGN_24_10',
    speaker: boss,
    text: {
      en: 'Ugh! Men, women, your country needs you! Be my shield and get me through this damned valley! …valley… valley…',
      zh: '呃！男人女人们，国家需要你们！给我当盾牌，护送我穿过这该死的山谷！……山谷……山谷……',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon04WaveIntro[];

export const oregon04WaveIntros: readonly Oregon04WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Dialogue portraits are included in the existing game-start image preload. */
export const oregon04CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon04WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
