import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForNevada01Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignCatalog, campaignLevelState } from '../src/content/campaign-catalog';
import { dakota10CampaignId } from '../src/content/dakota-10-identity';
import { nevada01CampaignContentVersion, nevada01CampaignId } from '../src/content/nevada-01-identity';
import { nevada01CampaignCopy } from '../src/content/nevada-01-campaign-copy';
import { nevada01LevelFortyOneCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

test('Labyrinth Gulch is formal Level 41 after Sioux Falls and uses map44', async () => {
  const stage = officialCampaignStages.find(({ scenarioId }) => scenarioId === nevada01CampaignId);
  assert.equal(officialCampaignStages.length, 41);
  assert.deepEqual(stage, {
    scenarioId: nevada01CampaignId,
    contentVersion: nevada01CampaignContentVersion,
    title: { en: 'Labyrinth Gulch · Level 41', zh: '迷宫峡谷 · 第 41 关' },
    globalLevel: 41,
    requiresCompletedScenarioIds: [dakota10CampaignId],
  });
  assert.deepEqual(nevada01LevelFortyOneCampaignContent.title, nevada01CampaignCopy.title);
  assert.equal(nevada01LevelFortyOneCampaignContent.contentVersion, nevada01CampaignContentVersion);
  assert.equal(nevada01LevelFortyOneCampaignContent.campaignWaveCount, 11);
  assert.equal(campaignCatalog.find(({ level }) => level === 41)?.mapFileNumber, 44);

  const locked = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(41, await locked.loadCampaign()), 'locked');

  const afterSiouxFalls = createProgress(createMemoryProfileRepository({
    completedScenarios: [dakota10CampaignId],
  }), officialCampaignStages);
  assert.equal(campaignLevelState(41, await afterSiouxFalls.loadCampaign()), 'available');
});

test('browser registry opens Labyrinth Gulch for all Free Play difficulties', async () => {
  const contentVersion = getBrowserScenarioContentVersion(nevada01CampaignId, []);
  assert.equal(contentVersion, nevada01CampaignContentVersion);

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const session = await createBrowserGame([]).open({
      scenarioId: nevada01CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 41_000 + index,
    });

    try {
      const view = session.observe();
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, nevada01CampaignContentVersion);
      assert.equal(view.scenarioId, nevada01CampaignId);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 11);
      assert.equal(view.units.filter(({ type }) => type === 'pyromaniac').length, 1);
    } finally {
      session.close();
    }
  }
});

test('Level 41 formal settlement advances the campaign while Free Play leaves the profile unchanged', async () => {
  const repository = createMemoryProfileRepository({
    completedScenarios: [dakota10CampaignId],
    highScores: { [dakota10CampaignId]: 1_400 },
  });
  const progress = createProgress(repository, officialCampaignStages);
  const beforeFreePlay = await progress.exportProfileData();

  await assert.rejects(progress.applySettlement({
    settlementId: `labyrinth-free-session:${nevada01CampaignId}:11`,
    sessionId: 'labyrinth-free-session',
    scenarioId: nevada01CampaignId,
    mode: 'free',
    waveNumber: 11,
    outcome: 'victory',
    scoreBase: 8_000,
    displayScore: 8_000,
    highScoreCandidate: 8_000,
  }), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlay);

  const saved = await progress.applySettlement({
    settlementId: `labyrinth-formal-session:${nevada01CampaignId}:11`,
    sessionId: 'labyrinth-formal-session',
    scenarioId: nevada01CampaignId,
    mode: 'formal',
    waveNumber: 11,
    outcome: 'victory',
    scoreBase: 9_000,
    displayScore: 9_000,
    highScoreCandidate: 9_000,
  });
  assert.equal(saved.status, 'saved');
  assert.ok(saved.profile.completedScenarios.includes(nevada01CampaignId));
  assert.equal(saved.profile.highScores[nevada01CampaignId], 9_000);
  assert.equal(campaignLevelState(41, await progress.loadCampaign()), 'completed');
});

test('Labyrinth Gulch replay factory accepts its fixed content version and rejects unknown versions', async () => {
  const session = await createBrowserGameForNevada01Replay(nevada01CampaignContentVersion).open({
    scenarioId: nevada01CampaignId,
    contentVersion: nevada01CampaignContentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 41_004,
  });

  try {
    assert.equal(session.startRecord.scenarioId, nevada01CampaignId);
    assert.equal(session.startRecord.contentVersion, nevada01CampaignContentVersion);
    assert.equal(session.observe().wave?.totalWaves, 11);
  } finally {
    session.close();
  }

  for (const contentVersion of [undefined, `${nevada01CampaignContentVersion}-unknown`]) {
    await assert.rejects(
      createBrowserGameForNevada01Replay(contentVersion).open({
        scenarioId: nevada01CampaignId,
        contentVersion,
        mode: 'free',
        difficulty: 'medium',
        randomSeed: 41_005,
      }),
      (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
    );
  }
});
