import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { dakota07CampaignId } from '../src/content/dakota-07-identity';
import { dakota07CampaignCopy } from '../src/content/dakota-07-campaign-copy';
import { createDakota07CampaignContent } from '../src/content/dakota-07-campaign';
import { dakota07LevelThirtySevenCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const completedThroughLevelThirtySix = officialCampaignStages
  .filter(({ globalLevel }) => globalLevel !== undefined && globalLevel <= 36)
  .map(({ scenarioId }) => scenarioId);

test('Frost Station is Dakota level 37 and unlocks after Ice Rocks', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === dakota07CampaignId);
  assert.equal(officialCampaignStages.length, 37);
  assert.deepEqual(stage, {
    scenarioId: dakota07CampaignId,
    contentVersion: dakota07LevelThirtySevenCampaignContent.contentVersion,
    title: { en: 'Frost Station · Level 37', zh: '霜冻车站 · 第 37 关' },
    globalLevel: 37,
    requiresCompletedScenarioIds: ['campaign-dakota-06'],
  });
  assert.deepEqual(dakota07LevelThirtySevenCampaignContent.title, dakota07CampaignCopy.title);

  const locked = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(37, await locked.loadCampaign()), 'locked');

  const unlocked = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedThroughLevelThirtySix }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(36, await unlocked.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(37, await unlocked.loadCampaign()), 'available');
});

test('browser registry opens Frost Station for all Free Play difficulties without campaign progress', async () => {
  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const game = createBrowserGame([]);
    const contentVersion = getBrowserScenarioContentVersion(dakota07CampaignId, []);
    const session = await game.open({
      scenarioId: dakota07CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 37_000 + index,
    });

    try {
      const view = session.observe();
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 8);
    } finally {
      session.close();
    }
  }
});

test('browser registry opens formal Frost Station with the current profile unlock snapshot', async () => {
  const completedScenarioIds = [...completedThroughLevelThirtySix, 'campaign-oregon-10'];
  const expected = createDakota07CampaignContent(completedScenarioIds);
  const contentVersion = getBrowserScenarioContentVersion(dakota07CampaignId, completedScenarioIds);
  assert.equal(contentVersion, expected.contentVersion);
  assert.notEqual(contentVersion, createDakota07CampaignContent().contentVersion);

  const session = await createBrowserGame(completedScenarioIds).open({
    scenarioId: dakota07CampaignId,
    contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 37_100,
  });

  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, expected.contentVersion);
    assert.deepEqual(
      view.units.map(({ type, activity }) => [type, activity]).sort(),
      expected.units.map(({ type, activity }) => [type, activity]).sort(),
    );
    assert.ok(view.units.some(({ type, activity }) => type === 'grandpa' && activity === 4));
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 8);
  } finally {
    session.close();
  }
});

test('formal Frost Station victory writes completion and high score into campaign progress', async () => {
  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedThroughLevelThirtySix }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(37, await progress.loadCampaign()), 'available');

  const settlement = await progress.applySettlement({
    settlementId: `frost-station-session:${dakota07CampaignId}:8`,
    sessionId: 'frost-station-session',
    scenarioId: dakota07CampaignId,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 4_800,
    displayScore: 4_800,
    highScoreCandidate: 4_800,
  });

  assert.equal(settlement.status, 'saved');
  assert.ok(settlement.profile.completedScenarios.includes(dakota07CampaignId));
  assert.equal(settlement.profile.highScores[dakota07CampaignId], 4_800);
  const after = await progress.loadCampaign();
  assert.equal(campaignLevelState(37, after), 'completed');
  assert.equal(after.completedCount, 37);
});
