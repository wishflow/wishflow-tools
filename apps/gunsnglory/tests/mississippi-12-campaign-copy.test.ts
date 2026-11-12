import assert from 'node:assert/strict';
import test from 'node:test';
import { createMississippi12CampaignContent } from '../src/content/mississippi-12-campaign';
import { mississippi12CampaignCopy } from '../src/content/mississippi-12-campaign-copy';

test('Steam Valley English copy matches the APK and both languages use the content title', () => {
  assert.deepEqual(mississippi12CampaignCopy, {
    title: { en: 'Steam Valley', zh: '蒸汽谷' },
    overview: {
      en: 'In Steam Valley, the beautiful sounds of the steamboats ring out at daybreak!',
      zh: '在蒸汽谷，汽船悦耳的声音每天清晨都会响起！',
    },
    victoryTitle: { en: 'The Steam Valley Monster', zh: '蒸汽谷怪物' },
  });
  assert.deepEqual(createMississippi12CampaignContent().title, mississippi12CampaignCopy.title);
});
