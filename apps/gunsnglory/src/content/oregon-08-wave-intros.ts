import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Oregon08DialogueResource =
  | 'T_CAMPAIGN_28_01'
  | 'T_CAMPAIGN_28_02'
  | 'T_CAMPAIGN_28_03'
  | 'T_CAMPAIGN_28_04'
  | 'T_CAMPAIGN_28_05'
  | 'T_CAMPAIGN_28_06'
  | 'T_CAMPAIGN_28_07'
  | 'T_CAMPAIGN_28_08'
  | 'T_CAMPAIGN_28_09';

export interface Oregon08WaveIntro extends CampaignWaveIntro {
  dialogueResource: Oregon08DialogueResource;
}

const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const geezer: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Geezer', zh: '俄勒冈老爷子' });
const indian: LocalizedCampaignCopy = Object.freeze({ en: 'Indian', zh: '原住民' });
const settlers: LocalizedCampaignCopy = Object.freeze({ en: 'Settlers', zh: '拓荒者' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Oregon Boss', zh: '俄勒冈首领' });

/** APK dialogue and portrait references; Chinese copy is translated and no voice clip is inferred. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_28_01',
    speaker: gunslinger,
    text: {
      en: 'Hopefully, enough settlers will come today! I have some gambling debts and I really need their gold!',
      zh: '希望今天能来够多的拓荒者！我欠了不少赌债，正急需他们的金子！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_28_02',
    speaker: geezer,
    text: {
      en: "As I always say, don't play with gold!",
      zh: '我常说，别拿金子当赌注！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_28_03',
    speaker: indian,
    text: {
      en: 'Smoke signals: White - Man - White - Woman - North-east - South-east',
      zh: '烟雾信号：白人、男人；白人、女人；东北、东南。',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_28_04',
    speaker: gunslinger,
    text: {
      en: "Hey, you there, settlers in the north, you don't wanna play poker, do you?",
      zh: '喂，北边的拓荒者，你们不想玩几把扑克吗？',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_28_05',
    speaker: settlers,
    text: {
      en: 'Did you hear that? Maybe there\'s a casino nearby, honey!',
      zh: '你听见了吗？亲爱的，说不定附近有家赌场！',
    },
    portraitAsset: 'portrait_settlers',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_28_06',
    speaker: gunslinger,
    text: {
      en: "Yeah, sure, a casino! I'm the ace and you're the jack of clubs! The clubs means dead!",
      zh: '赌场？当然有！我是 A，你是梅花 J！梅花意味着死亡！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_28_07',
    speaker: indian,
    text: {
      en: 'Smoke signals: All - Directions - Tourists',
      zh: '烟雾信号：所有方向、游客。',
    },
    portraitAsset: 'portrait_indian',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_28_08',
    speaker: geezer,
    text: {
      en: "I don't know if I'm seeing double or if the settlers really are overrunning the place!",
      zh: '我都分不清是自己眼花，还是拓荒者真的要把这里挤爆了！',
    },
    portraitAsset: 'oregon_dakota_portrait_geezer',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_28_09',
    speaker: boss,
    text: {
      en: "Are you scared? Those aren't shots, it's a thunderstorm! Go ahead, men!",
      zh: '你们害怕了吗？那不是枪声，是雷雨！弟兄们，冲啊！',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Oregon08WaveIntro[];

export const oregon08WaveIntros: readonly Oregon08WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

/** Portraits join the game's initial image preload before their dialogue opens. */
export const oregon08CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(oregon08WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
