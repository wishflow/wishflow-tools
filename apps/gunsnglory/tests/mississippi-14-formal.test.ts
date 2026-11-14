import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi14Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createMississippi14CampaignContent } from '../src/content/mississippi-14-campaign';
import {
  mississippi14CampaignContentVersionFor,
} from '../src/content/mississippi-14-content-version';
import { mississippi14CampaignId } from '../src/content/mississippi-14-identity';
import { mississippi13CampaignId } from '../src/content/mississippi-13-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const pyromaniacUnlockScenarioId = 'campaign-nevada-10';
const salesmanUnlockScenarioId = 'campaign-alaska-10';
const completedThroughLevelTen = Array.from({ length: 10 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));
const completedThroughLevelTwelve = [
  ...completedThroughLevelTen,
  'campaign-mississippi-11',
  'campaign-mississippi-12',
];

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi14CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignUnitPool: undefined,
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

test('Riverside Mountains is formal level 14 and unlocks only after Golden River is completed', async () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 14);
  assert.deepEqual(stage, {
    scenarioId: mississippi14CampaignId,
    contentVersion: mississippi14CampaignContentVersionFor([]),
    title: { en: 'Riverside Mountains · Level 14', zh: '河畔群山 · 第 14 关' },
    globalLevel: 14,
    requiresCompletedScenarioIds: [mississippi13CampaignId],
  });
  assert.equal(officialCampaignStages.length, 26);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelTwelve,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(14, await progress.loadCampaign()), 'locked');

  await progress.applySettlement({
    sessionId: 'm14-unlock-after-m13',
    settlementId: `m14-unlock-after-m13:${mississippi13CampaignId}:9`,
    scenarioId: mississippi13CampaignId,
    mode: 'formal',
    waveNumber: 9,
    outcome: 'victory',
    scoreBase: 1_400,
    displayScore: 1_400,
    highScoreCandidate: 1_400,
  });
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(14, await progress.loadCampaign()), 'available');
});

test('registered Riverside Mountains opens Free Play at all difficulties without a placed Cannon', async () => {
  const completed = [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId];
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const contentVersion = getBrowserScenarioContentVersion(mississippi14CampaignId, completed);
    assert.equal(contentVersion, mississippi14CampaignContentVersionFor(completed));
    const session = await createBrowserGame(completed).open({
      scenarioId: mississippi14CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 1_414,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 7);
      assert.equal(view.wave?.cash, 365);
      assert.equal(view.wave?.lives, 25);
      assert.ok(view.units.some(({ type }) => type === 'mexican'));
      assert.ok(view.units.some(({ type }) => type === 'indian'));
      assert.ok(!view.units.some(({ type }) => type === 'cannon'), 'the pool template does not create a phantom placed Cannon');
      assert.deepEqual(view.units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type).sort(), ['pyromaniac', 'salesman']);
    } finally {
      session.close();
    }
  }
});

test('Riverside Mountains replay construction restores both unlock snapshots independently of the importing profile', async () => {
  const snapshots = [
    { completed: [], expected: [] },
    { completed: [pyromaniacUnlockScenarioId], expected: ['pyromaniac'] },
    { completed: [salesmanUnlockScenarioId], expected: ['salesman'] },
    { completed: [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId], expected: ['pyromaniac', 'salesman'] },
  ] as const;

  for (const snapshot of snapshots) {
    const contentVersion = mississippi14CampaignContentVersionFor(snapshot.completed);
    const replayGame = createBrowserGameForMississippi14Replay(contentVersion);
    const session = await replayGame.open({
      scenarioId: mississippi14CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 1_415,
    });
    try {
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.deepEqual(session.observe().units
        .filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type).sort(), snapshot.expected);
    } finally {
      session.close();
    }
  }
});

test('formal Riverside Mountains victory unlocks the next stage; Free Play results stay out of Progress', async () => {
  let sessionNumber = 0;
  const completed = [...completedThroughLevelTwelve, mississippi13CampaignId];
  const content = emptyRequestContent(completed);
  const game = createGame({
    scenarios: { [mississippi14CampaignId]: content },
    sessionIdSource: () => `m14-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: completed }), officialCampaignStages);
  const session = await game.open({
    scenarioId: mississippi14CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 1_416,
  });
  for (let frame = 0; frame < 40 && !session.terminalRecord(); frame += 1) session.advance({ deltaMs: 0 });

  const victory = session.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(mississippi14CampaignId));
  assert.equal(campaignLevelState(14, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(15, await progress.loadCampaign()), 'available');
  session.close();

  const freeContent = emptyRequestContent(completed);
  const freeSession = await createGame({ scenarios: { [mississippi14CampaignId]: freeContent } }).open({
    scenarioId: mississippi14CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_417,
  });
  for (let frame = 0; frame < 40 && !freeSession.terminalRecord(); frame += 1) freeSession.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(freeSession.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(freeSession.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  freeSession.close();
});
