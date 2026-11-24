import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { dakota06CampaignCopy } from '../src/content/dakota-06-campaign-copy';
import { createDakota06CampaignContent } from '../src/content/dakota-06-campaign';
import { dakota06CampaignId } from '../src/content/dakota-06-identity';
import { dakota06LevelThirtySixCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const completedThroughLevelThirtyFive = officialCampaignStages
  .slice(0, 35)
  .map(({ scenarioId }) => scenarioId);

test('Ice Rocks is Dakota level 36 and unlocks after Ghost Town', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota06CampaignId);
  assert.equal(officialCampaignStages.length, 39);
  assert.deepEqual(stage, {
    scenarioId: dakota06CampaignId,
    contentVersion: dakota06LevelThirtySixCampaignContent.contentVersion,
    title: { en: 'Ice Rocks · Level 36', zh: '冰岩 · 第 36 关' },
    globalLevel: 36,
    requiresCompletedScenarioIds: ['campaign-dakota-05'],
  });
  assert.deepEqual(dakota06LevelThirtySixCampaignContent.title, dakota06CampaignCopy.title);

  const locked = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(36, await locked.loadCampaign()), 'locked');

  const unlocked = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedThroughLevelThirtyFive }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(35, await unlocked.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(36, await unlocked.loadCampaign()), 'available');
});

test('browser registry opens Ice Rocks for all Free Play difficulties', async () => {
  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const game = createBrowserGame([]);
    const contentVersion = getBrowserScenarioContentVersion(dakota06CampaignId, []);
    const session = await game.open({
      scenarioId: dakota06CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 36_000 + index,
    });

    try {
      const view = session.observe();
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 9);
    } finally {
      session.close();
    }
  }
});

test('browser registry opens formal Ice Rocks with the same non-default profile snapshot', async () => {
  const completedScenarioIds = [...completedThroughLevelThirtyFive, 'campaign-dakota-10'];
  const expected = createDakota06CampaignContent(completedScenarioIds);
  const contentVersion = getBrowserScenarioContentVersion(dakota06CampaignId, completedScenarioIds);
  assert.equal(contentVersion, expected.contentVersion);
  assert.notEqual(contentVersion, createDakota06CampaignContent().contentVersion);

  const session = await createBrowserGame(completedScenarioIds).open({
    scenarioId: dakota06CampaignId,
    contentVersion,
    mode: 'formal',
    difficulty: 'hard',
    randomSeed: 36_100,
  });

  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, expected.contentVersion);
    assert.deepEqual(
      view.units.map(({ type }) => type).sort(),
      expected.units.map(({ type }) => type).sort(),
    );
    assert.ok(view.units.some(({ type, activity }) => type === 'sniper' && activity === 4));
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 9);
  } finally {
    session.close();
  }
});
