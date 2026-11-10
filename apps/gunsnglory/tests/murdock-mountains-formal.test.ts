import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { murdockMountainsCampaignContentVersion, murdockMountainsCampaignId } from '../src/content/murdock-mountains-campaign';
import { murdockMountainsLevelSixCampaignContent, officialCampaignStages } from '../src/content/official-campaign';

test('Murdock Mountains is the registered New Mexico sixth stage and follows Billy Hills', () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 6);
  assert.deepEqual(stage, {
    scenarioId: murdockMountainsCampaignId,
    contentVersion: murdockMountainsCampaignContentVersion,
    title: { en: 'Murdock Mountains · Level 6', zh: '默多克山脉 · 第 6 关' },
    globalLevel: 6,
    requiresCompletedScenarioIds: ['campaign-new-mexico-05'],
  });
  assert.equal(officialCampaignStages.length, 8);
  assert.equal(murdockMountainsLevelSixCampaignContent.formalSettlementSupported, true);
  assert.equal(getBrowserScenarioContentVersion(murdockMountainsCampaignId), murdockMountainsCampaignContentVersion);
});

test('registered map06 starts as a formal level and supports all Free Play difficulties', async () => {
  for (const mode of ['formal', 'free'] as const) {
    const difficulties = mode === 'formal' ? ['easy'] as const : ['easy', 'medium', 'hard'] as const;
    for (const difficulty of difficulties) {
      const session = await createBrowserGame(['campaign-new-mexico-05']).open({
        scenarioId: murdockMountainsCampaignId,
        mode,
        difficulty,
        randomSeed: 106,
      });

      try {
        const view = session.observe();
        assert.equal(session.startRecord.mode, mode);
        assert.equal(session.startRecord.difficulty, difficulty);
        assert.equal(view.wave?.number, 1);
        assert.equal(view.wave?.totalWaves, 10);
        assert.equal(view.wave?.lives, 50);
        assert.equal(view.wave?.cash, 250);
      } finally {
        session.close();
      }
    }
  }
});
