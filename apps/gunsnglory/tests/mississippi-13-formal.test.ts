import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi13Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createMississippi13CampaignContent } from '../src/content/mississippi-13-campaign';
import {
  mississippi13CampaignContentVersionFor,
} from '../src/content/mississippi-13-content-version';
import { mississippi13CampaignId } from '../src/content/mississippi-13-identity';
import { mississippi12CampaignId } from '../src/content/mississippi-12-identity';
import { mississippi11CampaignId } from '../src/content/mississippi-11-campaign';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const pyromaniacUnlockScenarioId = 'campaign-nevada-10';
const salesmanUnlockScenarioId = 'campaign-alaska-10';
const completedThroughLevelTen = Array.from({ length: 10 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));
const completedThroughLevelEleven = [...completedThroughLevelTen, mississippi11CampaignId];

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi13CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

test('Golden River is formal level 13 and unlocks only after Steam Valley is completed', async () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 13);
  assert.deepEqual(stage, {
    scenarioId: mississippi13CampaignId,
    contentVersion: mississippi13CampaignContentVersionFor([]),
    title: { en: 'Golden River · Level 13', zh: '黄金河 · 第 13 关' },
    globalLevel: 13,
    requiresCompletedScenarioIds: [mississippi12CampaignId],
  });
  assert.equal(officialCampaignStages.length, 25);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelEleven,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(12, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'locked');

  await progress.applySettlement({
    sessionId: 'm13-unlock-after-m12',
    settlementId: `m13-unlock-after-m12:${mississippi12CampaignId}:7`,
    scenarioId: mississippi12CampaignId,
    mode: 'formal',
    waveNumber: 7,
    outcome: 'victory',
    scoreBase: 1_200,
    displayScore: 1_200,
    highScoreCandidate: 1_200,
  });
  assert.equal(campaignLevelState(12, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'available');
});

test('registered Golden River opens Free Play at all difficulties with the current unlock snapshot', async () => {
  const completed = [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId];
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const contentVersion = getBrowserScenarioContentVersion(mississippi13CampaignId, completed);
    assert.equal(contentVersion, mississippi13CampaignContentVersionFor(completed));
    const session = await createBrowserGame(completed).open({
      scenarioId: mississippi13CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 1_313,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 9);
      assert.equal(view.wave?.cash, 365);
      assert.equal(view.wave?.lives, 25);
      assert.ok(view.units.some(({ type, cell }) => type === 'indian' && cell.x === 10 && cell.y === 6));
      assert.deepEqual(view.units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type), ['salesman', 'pyromaniac']);
    } finally {
      session.close();
    }
  }
});

test('Golden River replay construction restores all four recorded unlock snapshots independently of the importing profile', async () => {
  const snapshots = [
    { completed: [], expected: [] },
    { completed: [pyromaniacUnlockScenarioId], expected: ['pyromaniac'] },
    { completed: [salesmanUnlockScenarioId], expected: ['salesman'] },
    { completed: [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId], expected: ['salesman', 'pyromaniac'] },
  ] as const;

  for (const snapshot of snapshots) {
    const contentVersion = mississippi13CampaignContentVersionFor(snapshot.completed);
    const replayGame = createBrowserGameForMississippi13Replay(contentVersion);
    const session = await replayGame.open({
      scenarioId: mississippi13CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 1_314,
    });
    try {
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.deepEqual(session.observe().units
        .filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type), snapshot.expected);
    } finally {
      session.close();
    }
  }
});

test('formal Golden River settlement unlocks the next stage; Free Play results stay out of Progress', async () => {
  let sessionNumber = 0;
  const completed = [...completedThroughLevelEleven, mississippi12CampaignId];
  const content = emptyRequestContent(completed);
  const game = createGame({
    scenarios: { [mississippi13CampaignId]: content },
    sessionIdSource: () => `m13-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: completed }), officialCampaignStages);
  const session = await game.open({
    scenarioId: mississippi13CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 1_315,
  });
  for (let frame = 0; frame < 40 && !session.terminalRecord(); frame += 1) session.advance({ deltaMs: 0 });

  const victory = session.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(mississippi13CampaignId));
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(14, await progress.loadCampaign()), 'available');
  session.close();

  const freeContent = emptyRequestContent(completed);
  const freeSession = await createGame({ scenarios: { [mississippi13CampaignId]: freeContent } }).open({
    scenarioId: mississippi13CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_316,
  });
  for (let frame = 0; frame < 40 && !freeSession.terminalRecord(); frame += 1) freeSession.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(freeSession.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(freeSession.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  freeSession.close();
});
