import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi15Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { mississippi14CampaignId } from '../src/content/mississippi-14-identity';
import { createMississippi15CampaignContent } from '../src/content/mississippi-15-campaign';
import { mississippi15CampaignContentVersionFor } from '../src/content/mississippi-15-content-version';
import { mississippi15CampaignId } from '../src/content/mississippi-15-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const pyromaniacUnlockScenarioId = 'campaign-nevada-10';
const salesmanUnlockScenarioId = 'campaign-alaska-10';
const completedThroughLevelTen = Array.from({ length: 10 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));
const completedThroughLevelThirteen = [
  ...completedThroughLevelTen,
  'campaign-mississippi-11',
  'campaign-mississippi-12',
  'campaign-mississippi-13',
];
const completedThroughLevelFourteen = [...completedThroughLevelThirteen, mississippi14CampaignId];

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi15CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignUnitPool: undefined,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

test('Railroad Canyon is formal level 15 and stays locked until Riverside Mountains is complete', async () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 15);
  assert.deepEqual(stage, {
    scenarioId: mississippi15CampaignId,
    contentVersion: mississippi15CampaignContentVersionFor([]),
    title: { en: 'Railroad Canyon · Level 15', zh: '铁路峡谷 · 第 15 关' },
    globalLevel: 15,
    requiresCompletedScenarioIds: [mississippi14CampaignId],
  });
  assert.equal(officialCampaignStages.length, 17);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelThirteen,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(14, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(15, await progress.loadCampaign()), 'locked');

  await progress.applySettlement({
    sessionId: 'm15-unlock-after-m14',
    settlementId: `m15-unlock-after-m14:${mississippi14CampaignId}:7`,
    scenarioId: mississippi14CampaignId,
    mode: 'formal',
    waveNumber: 7,
    outcome: 'victory',
    scoreBase: 1_500,
    displayScore: 1_500,
    highScoreCandidate: 1_500,
  });
  assert.equal(campaignLevelState(14, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(15, await progress.loadCampaign()), 'available');
});

test('registered Railroad Canyon opens Free Play at all difficulties with saved unlock flags', async () => {
  const completed = [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId];
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const contentVersion = getBrowserScenarioContentVersion(mississippi15CampaignId, completed);
    assert.equal(contentVersion, mississippi15CampaignContentVersionFor(completed));
    const session = await createBrowserGame(completed).open({
      scenarioId: mississippi15CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 1_515,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 9);
      assert.equal(view.wave?.cash, 365);
      assert.equal(view.wave?.lives, 20);
      assert.ok(view.units.some(({ type }) => type === 'indian'));
      assert.deepEqual(view.units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type), ['salesman', 'pyromaniac']);
    } finally {
      session.close();
    }
  }
});

test('Railroad Canyon replay round-trip and replay factory preserve the recorded milestone snapshot', async () => {
  const recordedUnlocks = [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId];
  const snapshots = [
    { completed: [], expected: [] },
    { completed: [pyromaniacUnlockScenarioId], expected: ['pyromaniac'] },
    { completed: [salesmanUnlockScenarioId], expected: ['salesman'] },
    { completed: recordedUnlocks, expected: ['salesman', 'pyromaniac'] },
  ] as const;
  for (const snapshot of snapshots) {
    const contentVersion = mississippi15CampaignContentVersionFor(snapshot.completed);
    const replayFactorySession = await createBrowserGameForMississippi15Replay(contentVersion).open({
      scenarioId: mississippi15CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 1_519,
    });
    try {
      assert.deepEqual(replayFactorySession.observe().units
        .filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type), snapshot.expected);
    } finally {
      replayFactorySession.close();
    }
  }

  const content = emptyRequestContent(recordedUnlocks);
  const game = createGame({ scenarios: { [mississippi15CampaignId]: content } });
  const source = await game.open({
    scenarioId: mississippi15CampaignId,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 1_516,
  });
  try {
    for (let frame = 0; frame < 40 && !source.terminalRecord(); frame += 1) source.advance({ deltaMs: 0 });
    const outcome = source.terminalRecord();
    assert.ok(outcome, 'zero-request Railroad Canyon reaches its deterministic victory settlement');
    const serialized = await source.exportReplay();
    const replay = await game.replay(serialized);
    try {
      assert.equal(replay.sourceStartRecord.contentVersion, content.contentVersion);
      assert.deepEqual(replay.session.observe().units
        .filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type), ['salesman', 'pyromaniac']);
      assert.deepEqual(replay.session.observe().wave?.settlement, source.observe().wave?.settlement);
    } finally {
      replay.session.close();
    }
  } finally {
    source.close();
  }
});

test('formal Railroad Canyon victory completes level 15; Free Play result leaves profile unchanged', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent(completedThroughLevelFourteen);
  const game = createGame({
    scenarios: { [mississippi15CampaignId]: content },
    sessionIdSource: () => `m15-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelFourteen,
  }), officialCampaignStages);

  const formal = await game.open({
    scenarioId: mississippi15CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 1_517,
  });
  for (let frame = 0; frame < 40 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(mississippi15CampaignId));
  assert.equal(campaignLevelState(15, await progress.loadCampaign()), 'completed');
  formal.close();

  const freeContent = emptyRequestContent([]);
  const free = await createGame({ scenarios: { [mississippi15CampaignId]: freeContent } }).open({
    scenarioId: mississippi15CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_518,
  });
  for (let frame = 0; frame < 40 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(free.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  free.close();
});
