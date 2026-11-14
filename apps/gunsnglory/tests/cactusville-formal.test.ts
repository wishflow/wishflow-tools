import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForCactusvilleReplay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import {
  cactusvilleCampaignContentVersionFor,
  cactusvilleCampaignId,
  cactusvilleCompletedScenarioIdsForContentVersion,
  createCactusvilleCampaignContent,
} from '../src/content/cactusville-campaign';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { cactusvilleLevelEightCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';

const completedThroughMapSeven = Array.from({ length: 7 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));

test('Cactusville is New Mexico level eight and follows only Lucky Lake', async () => {
  const stage = officialCampaignStages.find(({ globalLevel }) => globalLevel === 8);
  assert.deepEqual(stage, {
    scenarioId: cactusvilleCampaignId,
    contentVersion: cactusvilleLevelEightCampaignContent.contentVersion,
    title: { en: 'Cactusville · Level 8', zh: '仙人掌镇 · 第 8 关' },
    globalLevel: 8,
    requiresCompletedScenarioIds: ['campaign-new-mexico-07'],
  });
  assert.equal(officialCampaignStages.length, 26);
  assert.equal(cactusvilleLevelEightCampaignContent.formalSettlementSupported, true);
  assert.equal(getBrowserScenarioContentVersion(cactusvilleCampaignId), cactusvilleLevelEightCampaignContent.contentVersion);

  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(8, await progress.loadCampaign()), 'locked');
  const afterMapSeven = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapSeven.slice(0, 6),
  }), officialCampaignStages);
  assert.equal(campaignLevelState(8, await afterMapSeven.loadCampaign()), 'locked');
  await afterMapSeven.applySettlement({
    settlementId: 'map07-victory:campaign-new-mexico-07:10',
    sessionId: 'map07-victory',
    scenarioId: 'campaign-new-mexico-07',
    mode: 'formal',
    waveNumber: 10,
    outcome: 'victory',
    scoreBase: 800,
    displayScore: 800,
    highScoreCandidate: 800,
  });
  assert.equal(campaignLevelState(8, await afterMapSeven.loadCampaign()), 'available');
});

test('registered map08 opens formally and in Free Play at every difficulty', async () => {
  for (const { mode, difficulty, completedScenarioIds } of [
    { mode: 'formal', difficulty: 'easy', completedScenarioIds: completedThroughMapSeven },
    { mode: 'free', difficulty: 'easy', completedScenarioIds: [] },
    { mode: 'free', difficulty: 'medium', completedScenarioIds: [] },
    { mode: 'free', difficulty: 'hard', completedScenarioIds: [] },
  ] as const) {
    const contentVersion = getBrowserScenarioContentVersion(cactusvilleCampaignId, completedScenarioIds);
    const session = await createBrowserGame(completedScenarioIds).open({
      scenarioId: cactusvilleCampaignId,
      contentVersion,
      mode,
      difficulty,
      randomSeed: 108,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, mode);
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 10);
      assert.equal(view.wave?.lives, 10);
      assert.equal(view.wave?.cash, 350);
      assert.equal(view.map.width, 17);
      assert.equal(view.map.height, 24);
      assert.ok(view.dynamites?.length);
      assert.ok(view.dynamites.every(({ unlocked }) => !unlocked));
      assert.equal(session.terminalRecord(), undefined, 'an unfinished map08 battle has no settlement record');
    } finally {
      session.close();
    }
  }
});

test('profile milestones control Cactusville map objects and preserve replay-visible snapshots', async () => {
  const snapshots = [
    { completed: [], hasDynamite: false, units: [] },
    { completed: ['campaign-mississippi-10'], hasDynamite: true, units: [] },
    { completed: ['campaign-oregon-10'], hasDynamite: true, units: ['grandpa'] },
    { completed: ['campaign-dakota-10'], hasDynamite: false, units: ['sniper'] },
    { completed: ['campaign-nevada-10'], hasDynamite: false, units: ['pyromaniac'] },
    { completed: ['campaign-alaska-10'], hasDynamite: false, units: ['salesman'] },
  ] as const;

  for (const snapshot of snapshots) {
    const content = createCactusvilleCampaignContent(snapshot.completed);
    const contentVersion = cactusvilleCampaignContentVersionFor(snapshot.completed);
    const expectedUnitTypes = new Set<string>(snapshot.units as readonly string[]);
    assert.equal(content.contentVersion, contentVersion);
    assert.equal(content.dynamite?.unlocked, snapshot.hasDynamite);
    const unitTypes = new Set(content.units.map(({ type }) => type));
    for (const unit of ['grandpa', 'sniper', 'pyromaniac', 'salesman']) {
      assert.equal(unitTypes.has(unit), expectedUnitTypes.has(unit), `${unit} follows its own level milestone`);
    }

    const replaySnapshot = cactusvilleCompletedScenarioIdsForContentVersion(contentVersion);
    assert.ok(replaySnapshot);
    const replayContent = createCactusvilleCampaignContent(replaySnapshot);
    assert.equal(replayContent.contentVersion, contentVersion);
    assert.deepEqual(replayContent.dynamite, content.dynamite);
    assert.deepEqual(replayContent.units.map(({ type }) => type), content.units.map(({ type }) => type));

    const session = await createBrowserGameForCactusvilleReplay(contentVersion).open({
      scenarioId: cactusvilleCampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 108,
    });
    try {
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(session.observe().dynamites?.every(({ unlocked }) => unlocked === snapshot.hasDynamite), true);
    } finally {
      session.close();
    }
  }
});

test('formal Cactusville victory settles once; a Free Play result cannot enter the profile', async () => {
  const emptyWaveContent: ScenarioContent = {
    ...createCactusvilleCampaignContent(completedThroughMapSeven),
    contentVersion: 'gng-free-1.8.6-new-mexico-08-settlement-fixture-v1',
    campaignWaves: cactusvilleLevelEightCampaignContent.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: Array.from({ length: 10 }, () => 0) })),
    })),
  };
  const game = createGame({
    scenarios: { [cactusvilleCampaignId]: emptyWaveContent },
    sessionIdSource: (() => {
      let nextId = 0;
      return () => `map08-settlement-${++nextId}`;
    })(),
  });
  const formal = await game.open({
    scenarioId: cactusvilleCampaignId,
    contentVersion: emptyWaveContent.contentVersion,
    mode: 'formal',
    randomSeed: 108,
  });
  for (let index = 0; index < 10; index += 1) formal.advance({ deltaMs: 0 });
  const settlement = formal.terminalRecord();
  assert.equal(settlement?.outcome, 'victory');
  assert.equal(settlement?.mode, 'formal');

  const defeatProgress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapSeven,
  }), officialCampaignStages);
  const defeat = {
    ...settlement!,
    settlementId: 'map08-defeat:campaign-new-mexico-08:10',
    sessionId: 'map08-defeat',
    outcome: 'defeat' as const,
    scoreBase: 420,
    displayScore: 450,
    highScoreCandidate: 420,
  };
  const defeated = await defeatProgress.applySettlement(defeat);
  assert.equal(defeated.profile.completedScenarios.includes(cactusvilleCampaignId), false);
  assert.equal(defeated.profile.highScores[cactusvilleCampaignId], 420);
  assert.deepEqual((await defeatProgress.applySettlement(defeat)).profile, defeated.profile);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapSeven,
  }), officialCampaignStages);
  const saved = await progress.applySettlement(settlement!);
  assert.equal(saved.profile.completedScenarios.includes(cactusvilleCampaignId), true);
  assert.equal(saved.profile.highScores[cactusvilleCampaignId], settlement?.highScoreCandidate);
  assert.deepEqual((await progress.applySettlement(settlement!)).profile, saved.profile);
  formal.close();

  const free = await game.open({
    scenarioId: cactusvilleCampaignId,
    contentVersion: emptyWaveContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 109,
  });
  for (let index = 0; index < 10; index += 1) free.advance({ deltaMs: 0 });
  const freeSettlement = free.terminalRecord();
  assert.equal(freeSettlement?.mode, 'free');
  await assert.rejects(progress.applySettlement(freeSettlement!), /only accepts formal/i);
  assert.deepEqual((await progress.loadProfile()).completedScenarios, saved.profile.completedScenarios);
  free.close();
});
