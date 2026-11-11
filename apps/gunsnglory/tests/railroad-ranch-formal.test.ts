import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForRailroadRanchReplay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import {
  createRailroadRanchCampaignContent,
  railroadRanchCampaignContentVersion,
  railroadRanchCampaignContentVersionFor,
  railroadRanchCampaignId,
  railroadRanchCompletedScenarioIdsForContentVersion,
} from '../src/content/railroad-ranch-campaign';
import { railroadRanchWaveIntros } from '../src/content/railroad-ranch-wave-intros';
import { officialCampaignStages, railroadRanchLevelNineCampaignContent } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const completedThroughMapSeven = Array.from({ length: 7 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));
const completedThroughMapEight = [...completedThroughMapSeven, 'campaign-new-mexico-08'];

test('Railroad Ranch is registered as level nine and unlocks only after Cactusville', async () => {
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 9), {
    scenarioId: railroadRanchCampaignId,
    contentVersion: railroadRanchCampaignContentVersion,
    title: { en: 'Railroad Ranch · Level 9', zh: '铁路牧场 · 第 9 关' },
    globalLevel: 9,
    requiresCompletedScenarioIds: ['campaign-new-mexico-08'],
  });
  assert.equal(officialCampaignStages.length, 9);
  assert.equal(railroadRanchLevelNineCampaignContent.formalSettlementSupported, true);
  assert.equal(getBrowserScenarioContentVersion(railroadRanchCampaignId), railroadRanchCampaignContentVersion);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapSeven,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(8, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(9, await progress.loadCampaign()), 'locked');
  await progress.applySettlement({
    settlementId: 'map08-unlock:campaign-new-mexico-08:10',
    sessionId: 'map08-unlock',
    scenarioId: 'campaign-new-mexico-08',
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 800,
    displayScore: 800,
    highScoreCandidate: 800,
  });
  assert.equal(campaignLevelState(9, await progress.loadCampaign()), 'available');
});

test('registered map09 opens formally and in Free Play without unlock requirements', async () => {
  for (const { mode, difficulty, completedScenarioIds } of [
    { mode: 'formal', difficulty: 'easy', completedScenarioIds: completedThroughMapEight },
    { mode: 'free', difficulty: 'easy', completedScenarioIds: [] },
    { mode: 'free', difficulty: 'medium', completedScenarioIds: [] },
    { mode: 'free', difficulty: 'hard', completedScenarioIds: [] },
  ] as const) {
    const contentVersion = getBrowserScenarioContentVersion(railroadRanchCampaignId, completedScenarioIds);
    const session = await createBrowserGame(completedScenarioIds).open({
      scenarioId: railroadRanchCampaignId,
      contentVersion,
      mode,
      difficulty,
      randomSeed: 109,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, mode);
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 7);
      assert.equal(view.wave?.lives, 25);
      assert.equal(view.wave?.cash, 600);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(session.terminalRecord(), undefined);
    } finally {
      session.close();
    }
  }
});

test('wave intros preserve APK English, resources, portraits, and only confirmed voice routes', () => {
  assert.deepEqual(railroadRanchWaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]), [
    [1, 'T_CAMPAIGN_09_01'],
    [2, 'T_CAMPAIGN_09_02'],
    [3, 'T_CAMPAIGN_09_03'],
    [4, 'T_CAMPAIGN_09_04'],
    [5, 'T_CAMPAIGN_09_05'],
    [6, 'T_CAMPAIGN_09_06'],
    [7, 'T_CAMPAIGN_09_07'],
  ]);
  assert.deepEqual(railroadRanchWaveIntros.map(({ portraitAsset, voiceSound }) => [portraitAsset, voiceSound]), [
    ['portrait_pedro', 'sound_pedro'],
    ['portrait_pedro', 'sound_pedro'],
    ['portrait_settlers', 'sound_siedler'],
    ['portrait_pedro', 'sound_pedro'],
    ['portrait_engineer', undefined],
    ['portrait_pedro', 'sound_pedro'],
    ['portrait_pedro', 'sound_pedro'],
  ]);
  assert.deepEqual(railroadRanchWaveIntros.map(({ text }) => text.en), [
    "There's only one thing on Railroad Ranch: trains!",
    'We have to use the railroad strategically to trap the settlers in our pincers.',
    "Where do we go now? Haven't we been here before? I think we're going around in a circle...",
    "Look out! They're coming through the pass in the south, too!",
    "The pot is glowing. The cash box is jingling. That's the way it ought to be!",
    "This is just a big gamble! Sometimes they run this way, sometimes they run that way! You don't know which way to turn!",
    'The stragglers are bringing up the rear. That will be all for today.',
  ]);
  assert.ok(railroadRanchWaveIntros.every(({ text }) => text.zh.length > 0));
});

test('content versions and replay factory preserve the profile dynamite snapshot', async () => {
  const snapshots = [
    { completed: [], unlocked: false },
    { completed: ['campaign-mississippi-10'], unlocked: true },
    { completed: ['campaign-new-mexico-10'], unlocked: false },
  ] as const;

  for (const snapshot of snapshots) {
    const content = createRailroadRanchCampaignContent(snapshot.completed);
    const version = railroadRanchCampaignContentVersionFor(snapshot.completed);
    assert.equal(content.contentVersion, version);
    assert.equal(content.dynamite?.unlocked, snapshot.unlocked);
    const reconstructed = railroadRanchCompletedScenarioIdsForContentVersion(version);
    assert.ok(reconstructed);
    const replayContent = createRailroadRanchCampaignContent(reconstructed);
    assert.equal(replayContent.contentVersion, version);
    assert.equal(replayContent.dynamite?.unlocked, snapshot.unlocked);

    const session = await createBrowserGameForRailroadRanchReplay(version).open({
      scenarioId: railroadRanchCampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 109,
    });
    try {
      assert.equal(session.startRecord.contentVersion, version);
      assert.equal(session.observe().dynamites?.every(({ unlocked }) => unlocked === snapshot.unlocked), true);
    } finally {
      session.close();
    }
  }
  assert.equal(railroadRanchCompletedScenarioIdsForContentVersion('unknown-map09-version'), undefined);
});

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createRailroadRanchCampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: Array.from({ length: 10 }, () => 0) })),
    })),
  };
}

test('map09 settled replay exports and replays its content version', async () => {
  const fixtureVersion = `${railroadRanchCampaignContentVersion}-replay-fixture`;
  const fixtureContent = {
    ...emptyRequestContent([]),
    contentVersion: fixtureVersion,
  };
  const game = createGame({
    scenarios: { [railroadRanchCampaignId]: fixtureContent },
    sessionIdSource: () => 'map09-replay-fixture',
  });
  const session = await game.open({
    scenarioId: railroadRanchCampaignId,
    contentVersion: fixtureVersion,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 109,
  });

  for (let index = 0; index < 12 && !session.terminalRecord(); index += 1) session.advance({ deltaMs: 0 });
  assert.equal(session.terminalRecord()?.outcome, 'victory');

  const serialized = await session.exportReplay();
  const source = JSON.parse(serialized) as { startRecord: { scenarioId: string; contentVersion: string } };
  assert.equal(source.startRecord.scenarioId, railroadRanchCampaignId);
  assert.equal(source.startRecord.contentVersion, fixtureVersion);

  const replay = await game.replay(serialized);
  assert.equal(replay.sourceStartRecord.contentVersion, fixtureVersion);
  assert.deepEqual(replay.session.observe().wave?.settlement, session.observe().wave?.settlement);
});

test('formal map09 victory updates completion and best score; Free Play never enters progress', async () => {
  let sessionNumber = 0;
  const scenario = emptyRequestContent(completedThroughMapEight);
  const game = createGame({
    scenarios: { [railroadRanchCampaignId]: scenario },
    sessionIdSource: () => `map09-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapEight,
  }), officialCampaignStages);

  const formal = await game.open({
    scenarioId: railroadRanchCampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 109,
  });
  for (let index = 0; index < 12 && !formal.terminalRecord(); index += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(railroadRanchCampaignId));
  assert.equal(saved.profile.highScores[railroadRanchCampaignId], victory?.highScoreCandidate);
  assert.deepEqual((await progress.applySettlement(victory!)).profile, saved.profile);
  formal.close();

  const free = await game.open({
    scenarioId: railroadRanchCampaignId,
    contentVersion: scenario.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 110,
  });
  for (let index = 0; index < 12 && !free.terminalRecord(); index += 1) free.advance({ deltaMs: 0 });
  const freeResult = free.terminalRecord();
  assert.equal(freeResult?.mode, 'free');
  await assert.rejects(progress.applySettlement(freeResult!), /only accepts formal/i);
  assert.deepEqual((await progress.loadProfile()).completedScenarios, saved.profile.completedScenarios);
  free.close();
});
