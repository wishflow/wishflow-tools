import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { murdockMountainsCampaignContentVersion, murdockMountainsCampaignId } from '../src/content/murdock-mountains-campaign';
import { murdockMountainsLevelSixCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { newMexicoCampaignContentVersionFor } from '../src/content/new-mexico-replay-content-version';

test('Murdock Mountains is the registered New Mexico sixth stage and follows Billy Hills', () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 6);
  assert.deepEqual(stage, {
    scenarioId: murdockMountainsCampaignId,
    contentVersion: murdockMountainsLevelSixCampaignContent.contentVersion,
    title: { en: 'Murdock Mountains · Level 6', zh: '默多克山脉 · 第 6 关' },
    globalLevel: 6,
    requiresCompletedScenarioIds: ['campaign-new-mexico-05'],
  });
  assert.equal(officialCampaignStages.length, 22);
  assert.equal(murdockMountainsLevelSixCampaignContent.formalSettlementSupported, true);
  assert.equal(murdockMountainsCampaignContentVersion, 'gng-free-1.8.6-new-mexico-06-formal-v1');
  assert.equal(getBrowserScenarioContentVersion(murdockMountainsCampaignId), newMexicoCampaignContentVersionFor(murdockMountainsCampaignId, []));
  assert.equal(murdockMountainsLevelSixCampaignContent.contentVersion, newMexicoCampaignContentVersionFor(murdockMountainsCampaignId, []));
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
