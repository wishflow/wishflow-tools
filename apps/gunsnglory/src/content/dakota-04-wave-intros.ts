import type { CampaignWaveIntro, LocalizedCampaignCopy } from './cow-gulch-wave-intros';

export type Dakota04DialogueResource =
  | 'T_CAMPAIGN_34_01'
  | 'T_CAMPAIGN_34_02'
  | 'T_CAMPAIGN_34_03'
  | 'T_CAMPAIGN_34_04'
  | 'T_CAMPAIGN_34_05'
  | 'T_CAMPAIGN_34_06'
  | 'T_CAMPAIGN_34_07'
  | 'T_CAMPAIGN_34_08'
  | 'T_CAMPAIGN_34_09';

export interface Dakota04WaveIntro extends CampaignWaveIntro {
  dialogueResource: Dakota04DialogueResource;
}

const pedro: LocalizedCampaignCopy = Object.freeze({ en: 'Pedro', zh: '佩德罗' });
const gunslinger: LocalizedCampaignCopy = Object.freeze({ en: 'Gunslinger', zh: '枪手' });
const mexican: LocalizedCampaignCopy = Object.freeze({ en: 'Mexican', zh: '墨西哥人' });
const calamity: LocalizedCampaignCopy = Object.freeze({ en: 'Calamity', zh: '卡拉米蒂' });
const boss: LocalizedCampaignCopy = Object.freeze({ en: 'Dakota Boss', zh: '达科他头目' });

/** APK English strings include their literal outer quotes where present; no voice routes are inferred. */
const waveIntros = [
  {
    waveNumber: 1,
    dialogueResource: 'T_CAMPAIGN_34_01',
    speaker: pedro,
    text: {
      en: 'I still remember when my father sent me here as a child…',
      zh: '我还记得小时候，父亲把我送到这里……',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 2,
    dialogueResource: 'T_CAMPAIGN_34_02',
    speaker: gunslinger,
    text: {
      en: 'Probably so you would get lost and never find your way back home!',
      zh: '大概是想让你迷路，再也找不到回家的路吧！',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 3,
    dialogueResource: 'T_CAMPAIGN_34_03',
    speaker: pedro,
    text: {
      en: '"Hey, that\'s not funny! I grew up here! Alone!"',
      zh: '“嘿，这可不好笑！我就是在这里长大的！一个人！”',
    },
    portraitAsset: 'portrait_pedro',
  },
  {
    waveNumber: 4,
    dialogueResource: 'T_CAMPAIGN_34_04',
    speaker: mexican,
    text: {
      en: '"The settlers are coming! The settlers are coming! Get into safety or they\'ll throw their clothes or some horse apples at you!"',
      zh: '“拓荒者来了！拓荒者来了！快躲起来，不然他们会把衣服或马粪扔向你！”',
    },
    portraitAsset: 'portrait_mexican',
  },
  {
    waveNumber: 5,
    dialogueResource: 'T_CAMPAIGN_34_05',
    speaker: calamity,
    text: {
      en: '"Get out of my line of fire or I\'ll give you a third nostril, gunslinger!"',
      zh: '“别挡我的射击线，枪手！否则我就在你脸上打出第三个鼻孔！”',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 6,
    dialogueResource: 'T_CAMPAIGN_34_06',
    speaker: gunslinger,
    text: {
      en: '"Sweetheart, I\'ll forgive you, because it\'s you."',
      zh: '“亲爱的，就因为是你，我会原谅你的。”',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 7,
    dialogueResource: 'T_CAMPAIGN_34_07',
    speaker: calamity,
    text: {
      en: '"You better move your butt to the south, or you\'ll have four buttocks!"',
      zh: '“你最好快往南边挪，不然就要长出四瓣屁股了！”',
    },
    portraitAsset: 'oregon_dakota_portrait_calamity',
  },
  {
    waveNumber: 8,
    dialogueResource: 'T_CAMPAIGN_34_08',
    speaker: gunslinger,
    text: {
      en: '"Save up your ammunition for the settlers, honey! They\'re charging the Badlands now!"',
      zh: '“把弹药省下来对付拓荒者，亲爱的！他们正向荒原冲来！”',
    },
    portraitAsset: 'portrait_gunslinger',
  },
  {
    waveNumber: 9,
    dialogueResource: 'T_CAMPAIGN_34_09',
    speaker: boss,
    text: {
      en: '"I\'m sure that I will be saved! Listen to me, bandits, you don\'t have to make an effort!"',
      zh: '“我肯定会获救！听着，土匪们，你们不用费劲！”',
    },
    portraitAsset: 'oregon_dakota_portrait_boss',
  },
] satisfies Dakota04WaveIntro[];

export const dakota04WaveIntros: readonly Dakota04WaveIntro[] = Object.freeze(
  waveIntros.map((intro) => Object.freeze(intro)),
);

export const dakota04CampaignPortraitAssets: readonly string[] = Object.freeze(
  [...new Set(dakota04WaveIntros.map(({ portraitAsset }) => portraitAsset))],
);
