import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrowserGame, getBrowserScenarioContentVersion } from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import {
  createMississippi12CampaignContent,
  mississippi12CampaignContentVersionFor,
} from '../src/content/mississippi-12-campaign';
import { mississippi11CampaignId } from '../src/content/mississippi-11-campaign';
import { mississippi12CampaignId } from '../src/content/mississippi-12-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const completedThroughLevelTen = Array.from({ length: 10 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));
const completedThroughLevelEleven = [...completedThroughLevelTen, mississippi11CampaignId];

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi12CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({
        ...pool,
        requests: pool.requests.map(() => 0),
      })),
    })),
  };
}

test('Steam Valley is level 12, unlocks after Traveller’s Town, and gates Golden River behind its completion', async () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 12);
  assert.deepEqual(stage, {
    scenarioId: mississippi12CampaignId,
    contentVersion: mississippi12CampaignContentVersionFor([]),
    title: { en: 'Steam Valley · Level 12', zh: '蒸汽谷 · 第 12 关' },
    globalLevel: 12,
    requiresCompletedScenarioIds: [mississippi11CampaignId],
  });
  assert.equal(officialCampaignStages.length, 14);
  assert.equal(officialCampaignStages.some(({ globalLevel }) => globalLevel === 13), true);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelTen,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(11, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(12, await progress.loadCampaign()), 'locked');

  await progress.applySettlement({
    sessionId: 'm12-unlock-level-11',
    settlementId: `m12-unlock-level-11:${mississippi11CampaignId}:8`,
    scenarioId: mississippi11CampaignId,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 800,
    displayScore: 800,
    highScoreCandidate: 800,
  });
  assert.equal(campaignLevelState(12, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'locked');
});

test('formal Steam Valley victory completes level 12 and saves its score exactly once', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent(completedThroughLevelEleven);
  const game = createGame({
    scenarios: { [mississippi12CampaignId]: content },
    sessionIdSource: () => `m12-formal-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelEleven,
  }), officialCampaignStages);
  const session = await game.open({
    scenarioId: mississippi12CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 121,
  });
  for (let index = 0; index < 30 && !session.terminalRecord(); index += 1) {
    session.advance({ deltaMs: 0 });
  }

  const victory = session.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  assert.equal(victory?.scenarioId, mississippi12CampaignId);
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(mississippi12CampaignId));
  assert.equal(saved.profile.highScores[mississippi12CampaignId], victory?.highScoreCandidate);
  assert.equal(campaignLevelState(12, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'available');
  assert.deepEqual((await progress.applySettlement(victory!)).profile, saved.profile);
  session.close();

  const defeatProgress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelEleven,
  }), officialCampaignStages);
  const defeat = {
    ...victory!,
    sessionId: 'm12-formal-defeat',
    settlementId: `m12-formal-defeat:${mississippi12CampaignId}:${victory!.waveNumber}`,
    outcome: 'defeat' as const,
  };
  const defeated = await defeatProgress.applySettlement(defeat);
  assert.equal(defeated.profile.completedScenarios.includes(mississippi12CampaignId), false);
  assert.equal(campaignLevelState(12, await defeatProgress.loadCampaign()), 'available');
});

test('Free Play opens actual Steam Valley in all difficulties without changing the profile', async () => {
  const profileData = {
    settings: { simulationSpeed: 1.5, difficulty: 'medium' as const, soundEnabled: false },
    completedScenarios: completedThroughLevelEleven,
    highScores: { [mississippi11CampaignId]: 812 },
    appliedSettlementIds: ['previous-formal-settlement'],
  };
  const progress = createProgress(createMemoryProfileRepository(profileData), officialCampaignStages);
  const before = await progress.exportProfileData();

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const completedScenarioIds = [...completedThroughLevelEleven, 'campaign-nevada-10'];
    const contentVersion = getBrowserScenarioContentVersion(mississippi12CampaignId, completedScenarioIds);
    assert.equal(contentVersion, mississippi12CampaignContentVersionFor(completedScenarioIds));
    const session = await createBrowserGame(completedScenarioIds).open({
      scenarioId: mississippi12CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 122,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 7);
      assert.ok(view.units.some(({ type }) => type === 'pyromaniac'));
    } finally {
      session.close();
    }

    const emptyContent = emptyRequestContent([...completedThroughLevelEleven, 'campaign-nevada-10']);
    const emptyGame = createGame({ scenarios: { [mississippi12CampaignId]: emptyContent } });
    const emptySession = await emptyGame.open({
      scenarioId: mississippi12CampaignId,
      contentVersion: emptyContent.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 123,
    });
    for (let index = 0; index < 30 && !emptySession.terminalRecord(); index += 1) {
      emptySession.advance({ deltaMs: 0 });
    }
    const freeResult = emptySession.terminalRecord();
    assert.equal(freeResult?.outcome, 'victory');
    assert.equal(freeResult?.mode, 'free');
    await assert.rejects(progress.applySettlement(freeResult!), /only accepts formal/i);
    assert.deepEqual(await progress.exportProfileData(), before);
    emptySession.close();
  }
});
