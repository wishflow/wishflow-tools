import type { LocalizedCampaignCopy } from './cow-gulch-wave-intros';

/** Original APK English level name and description with a project Chinese translation. */
export const bombingtonCampaignCopy = Object.freeze({
  title: Object.freeze({ en: 'Bombington', zh: '炸弹镇' }),
  overview: Object.freeze({
    en: 'This town is a Mecca for all lovers of large and impressive explosions.',
    zh: '这里是所有钟爱巨大而壮观爆炸的人们的圣地。',
  }),
}) satisfies {
  title: LocalizedCampaignCopy;
  overview: LocalizedCampaignCopy;
};
