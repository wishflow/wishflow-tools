import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi11Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import {
  createMississippi11CampaignContent,
  mississippi11CampaignContentVersionFor,
  mississippi11CampaignId,
} from '../src/content/mississippi-11-campaign';
import { lostCityCampaignId } from '../src/content/lost-city-campaign';
import { mississippi12CampaignId } from '../src/content/mississippi-12-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const completedThroughLevelNine = Array.from({ length: 9 }, (_, index) => (
  'campaign-new-mexico-' + String(index + 1).padStart(2, '0')
));

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi11CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

test('Traveller’s Town is level 11, locked until Lost City is complete, and later levels stay gated', async () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 11);
  assert.deepEqual(stage, {
    scenarioId: mississippi11CampaignId,
    contentVersion: mississippi11CampaignContentVersionFor([]),
    title: { en: "Traveller's Town · Level 11", zh: '旅行者小镇 · 第 11 关' },
    globalLevel: 11,
    requiresCompletedScenarioIds: [lostCityCampaignId],
  });
  assert.equal(officialCampaignStages.length, 16);
  assert.equal(createMississippi11CampaignContent().formalSettlementSupported, true);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelNine,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(10, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(11, await progress.loadCampaign()), 'locked');

  await progress.applySettlement({
    sessionId: 'm11-unlock-level-10',
    settlementId: 'm11-unlock-level-10:' + lostCityCampaignId + ':10',
    scenarioId: lostCityCampaignId,
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 800,
    displayScore: 800,
    highScoreCandidate: 800,
  });
  assert.equal(campaignLevelState(11, await progress.loadCampaign()), 'available');

  await progress.applySettlement({
    sessionId: 'm11-complete-level-11',
    settlementId: 'm11-complete-level-11:' + mississippi11CampaignId + ':8',
    scenarioId: mississippi11CampaignId,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 900,
    displayScore: 900,
    highScoreCandidate: 900,
  });
  assert.equal(campaignLevelState(12, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(13, await progress.loadCampaign()), 'locked');
  assert.equal(campaignLevelState(15, await progress.loadCampaign()), 'locked');
  assert.equal(
    getBrowserScenarioContentVersion(mississippi12CampaignId),
    'gng-free-1.8.6-mississippi-12-formal-v1-pyro0',
    'the browser can construct Steam Valley content before its formal stage is registered',
  );
});

test('Traveller’s Town opens in Free Play at all three difficulties without prior campaign progress', async () => {
  const contentVersion = mississippi11CampaignContentVersionFor([]);
  assert.equal(getBrowserScenarioContentVersion(mississippi11CampaignId), contentVersion);

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await createBrowserGame([]).open({
      scenarioId: mississippi11CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 111,
    });

    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(session.observe().wave?.number, 1);
      assert.equal(session.observe().wave?.totalWaves, 8);
    } finally {
      session.close();
    }
  }
});

test('Traveller’s Town replay factory restores each campaign unlock snapshot independently of the active profile', async () => {
  const snapshots = [
    { completed: [], unlocked: [] },
    { completed: ['campaign-nevada-10'], unlocked: ['pyromaniac'] },
    { completed: ['campaign-nevada-10', 'campaign-alaska-10'], unlocked: ['pyromaniac', 'salesman'] },
  ] as const;

  for (const snapshot of snapshots) {
    const version = mississippi11CampaignContentVersionFor(snapshot.completed);
    assert.equal(getBrowserScenarioContentVersion(mississippi11CampaignId, snapshot.completed), version);
    const expectedUnits = createMississippi11CampaignContent(snapshot.completed).units
      .filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
      .map(({ type }) => type)
      .sort();
    assert.deepEqual(expectedUnits, [...snapshot.unlocked].sort());

    const session = await createBrowserGameForMississippi11Replay(version).open({
      scenarioId: mississippi11CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 111,
    });
    try {
      assert.equal(session.startRecord.contentVersion, version);
      const actualUnits = session.observe().units
        .filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type)
        .sort();
      assert.deepEqual(actualUnits, [...snapshot.unlocked].sort());
    } finally {
      session.close();
    }
  }
});

test('formal Traveller’s Town victory writes level 11 progress; Free Play remains isolated', async () => {
  let sessionNumber = 0;
  const completedThroughLevelTen = [...completedThroughLevelNine, lostCityCampaignId];
  const formalContent = emptyRequestContent(completedThroughLevelTen);
  const formalGame = createGame({
    scenarios: { [mississippi11CampaignId]: formalContent },
    sessionIdSource: () => `m11-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelTen,
  }), officialCampaignStages);

  const formal = await formalGame.open({
    scenarioId: mississippi11CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 111,
  });
  for (let index = 0; index < 20 && !formal.terminalRecord(); index += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  assert.equal(victory?.waveNumber, 8);
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(mississippi11CampaignId));
  assert.equal(saved.profile.highScores[mississippi11CampaignId], victory?.highScoreCandidate);
  assert.deepEqual((await progress.applySettlement(victory!)).profile, saved.profile);
  formal.close();

  const freeContent = emptyRequestContent([]);
  const free = await createGame({ scenarios: { [mississippi11CampaignId]: freeContent } }).open({
    scenarioId: mississippi11CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 112,
  });
  for (let index = 0; index < 20 && !free.terminalRecord(); index += 1) free.advance({ deltaMs: 0 });
  const freeResult = free.terminalRecord();
  assert.equal(freeResult?.outcome, 'victory');
  assert.equal(freeResult?.mode, 'free');
  await assert.rejects(progress.applySettlement(freeResult!), /only accepts formal/i);
  assert.deepEqual((await progress.loadProfile()).completedScenarios, saved.profile.completedScenarios);
  assert.equal((await progress.loadProfile()).highScores[mississippi11CampaignId], saved.profile.highScores[mississippi11CampaignId]);
  free.close();
});
