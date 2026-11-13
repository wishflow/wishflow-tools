import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi17Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createMississippi17CampaignContent } from '../src/content/mississippi-17-campaign';
import {
  mississippi17CampaignContentVersionFor,
  mississippi17CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-17-content-version';
import { mississippi17CampaignId } from '../src/content/mississippi-17-identity';
import { mississippi17LevelSeventeenCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const pyromaniacUnlock = 'campaign-nevada-10';
const salesmanUnlock = 'campaign-alaska-10';
const sniperUnlock = 'campaign-dakota-10';
const grandpaUnlock = 'campaign-oregon-10';
const completedThroughLevelFifteen = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
];

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi17CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

test('Dead Rocks is formal level 17 and requires Highpoint Terrace completion', async () => {
  assert.equal(officialCampaignStages.length, 21);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 17), {
    scenarioId: mississippi17CampaignId,
    contentVersion: mississippi17CampaignContentVersionFor([]),
    title: { en: 'Dead Rocks · Level 17', zh: '死亡岩地 · 第 17 关' },
    globalLevel: 17,
    requiresCompletedScenarioIds: ['campaign-mississippi-16'],
  });
  assert.equal(mississippi17LevelSeventeenCampaignContent.formalSettlementSupported, true);
  assert.equal(mississippi17LevelSeventeenCampaignContent.id, mississippi17CampaignId);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelFifteen,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(16, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(17, await progress.loadCampaign()), 'locked');
  await progress.applySettlement({
    settlementId: 'm17-unlock-after-m16:campaign-mississippi-16:8',
    sessionId: 'm17-unlock-after-m16',
    scenarioId: 'campaign-mississippi-16',
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 1_700,
    displayScore: 1_700,
    highScoreCandidate: 1_700,
  });
  assert.equal(campaignLevelState(16, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(17, await progress.loadCampaign()), 'available');
});

test('registered Dead Rocks opens in Free Play at all difficulties with its eight-wave scene', async () => {
  const completed = [pyromaniacUnlock, salesmanUnlock];
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const contentVersion = getBrowserScenarioContentVersion(mississippi17CampaignId, completed);
    assert.equal(contentVersion, mississippi17CampaignContentVersionFor(completed));
    const session = await createBrowserGame(completed).open({
      scenarioId: mississippi17CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 1_717,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 8);
      assert.equal(view.wave?.cash, 365);
      assert.equal(view.wave?.lives, 20);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.ok(view.units.some(({ type, activity }) => type === 'gunslinger' && activity === 5));
      assert.ok(view.units.some(({ type, activity }) => type === 'mexican' && activity === 5));
      assert.ok(view.units.some(({ type, activity }) => type === 'indian' && activity === 5));
      assert.deepEqual(view.units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type).sort(), ['pyromaniac', 'pyromaniac', 'salesman']);
      assert.ok(!view.units.some(({ type }) => type === 'cannon'), 'no map Cannon is fabricated for an absent marker');
    } finally {
      session.close();
    }
  }
});

test('Dead Rocks content versions and replay round-trip preserve global unit unlock snapshots', async () => {
  const snapshots = [
    { completed: [], expected: [] },
    { completed: [grandpaUnlock], expected: ['grandpa', 'grandpa', 'grandpa'] },
    { completed: [sniperUnlock], expected: ['sniper'] },
    { completed: [pyromaniacUnlock], expected: ['pyromaniac', 'pyromaniac'] },
    { completed: [salesmanUnlock], expected: ['salesman'] },
    { completed: [grandpaUnlock, sniperUnlock, pyromaniacUnlock, salesmanUnlock], expected: [
      'grandpa', 'grandpa', 'grandpa', 'sniper', 'salesman', 'pyromaniac', 'pyromaniac',
    ] },
  ] as const;
  for (const snapshot of snapshots) {
    const version = mississippi17CampaignContentVersionFor(snapshot.completed);
    assert.equal(getBrowserScenarioContentVersion(mississippi17CampaignId, snapshot.completed), version);
    assert.deepEqual(mississippi17CompletedScenarioIdsForContentVersion(version), snapshot.completed);
    const replayFactory = createBrowserGameForMississippi17Replay(version);
    const session = await replayFactory.open({
      scenarioId: mississippi17CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 1_719,
    });
    try {
      assert.deepEqual(session.observe().units
        .filter(({ type }) => ['grandpa', 'sniper', 'pyromaniac', 'salesman'].includes(type))
        .map(({ type }) => type).sort(),
      [...snapshot.expected].sort());
    } finally {
      session.close();
    }
  }
  assert.equal(mississippi17CompletedScenarioIdsForContentVersion('unknown-map17-version'), undefined);

  const unlocks = [pyromaniacUnlock, salesmanUnlock];
  const content = emptyRequestContent(unlocks);
  const replayGame = createGame({ scenarios: { [mississippi17CampaignId]: content } });
  const source = await replayGame.open({
    scenarioId: mississippi17CampaignId,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 1_718,
  });
  try {
    for (let frame = 0; frame < 60 && !source.terminalRecord(); frame += 1) source.advance({ deltaMs: 0 });
    assert.ok(source.terminalRecord(), 'zero-request Dead Rocks reaches deterministic victory');
    const serialized = await source.exportReplay();
    const replay = await replayGame.replay(serialized);
    try {
      assert.equal(replay.sourceStartRecord.contentVersion, content.contentVersion);
      assert.deepEqual(replay.session.observe().wave?.settlement, source.observe().wave?.settlement);
      assert.deepEqual(replay.session.observe().units
        .filter(({ type }) => type === 'pyromaniac' || type === 'salesman').map(({ type }) => type).sort(),
      ['pyromaniac', 'pyromaniac', 'salesman']);
    } finally {
      replay.session.close();
    }
  } finally {
    source.close();
  }
});

test('formal Dead Rocks victory records level 17; Free Play cannot alter profile progress', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent(completedThroughLevelFifteen);
  const game = createGame({
    scenarios: { [mississippi17CampaignId]: content },
    sessionIdSource: () => `m17-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelFifteen,
  }), officialCampaignStages);

  const formal = await game.open({
    scenarioId: mississippi17CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 1_720,
  });
  for (let frame = 0; frame < 60 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  await progress.applySettlement(victory!);
  assert.ok((await progress.exportProfileData()).completedScenarios.includes(mississippi17CampaignId));
  assert.equal(campaignLevelState(17, await progress.loadCampaign()), 'completed');
  formal.close();

  const freeContent = emptyRequestContent([]);
  const free = await createGame({ scenarios: { [mississippi17CampaignId]: freeContent } }).open({
    scenarioId: mississippi17CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_721,
  });
  for (let frame = 0; frame < 60 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(free.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  free.close();
});
