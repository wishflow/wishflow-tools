import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi19Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createMississippi19CampaignContent } from '../src/content/mississippi-19-campaign';
import {
  mississippi19CampaignContentVersionFor,
  mississippi19CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-19-content-version';
import { mississippi19CampaignId } from '../src/content/mississippi-19-identity';
import { mississippi18CampaignId } from '../src/content/mississippi-18-identity';
import { mississippi19LevelNineteenCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const unlocks = [
  { scenarioId: 'campaign-oregon-10', type: 'grandpa' },
  { scenarioId: 'campaign-dakota-10', type: 'sniper' },
  { scenarioId: 'campaign-nevada-10', type: 'pyromaniac' },
  { scenarioId: 'campaign-alaska-10', type: 'salesman' },
] as const;

function completedForMask(mask: number): string[] {
  return unlocks.flatMap(({ scenarioId }, bit) => mask & (1 << bit) ? [scenarioId] : []);
}

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi19CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

test('Dust Falls is formal level 19 and unlocks after Shadow Town', async () => {
  assert.equal(officialCampaignStages.length, 25);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 19), {
    scenarioId: mississippi19CampaignId,
    contentVersion: mississippi19CampaignContentVersionFor([]),
    title: { en: 'Dust Falls · Level 19', zh: '尘瀑镇 · 第 19 关' },
    globalLevel: 19,
    requiresCompletedScenarioIds: [mississippi18CampaignId],
  });
  assert.equal(mississippi19LevelNineteenCampaignContent.formalSettlementSupported, true);
  assert.equal(mississippi19LevelNineteenCampaignContent.id, mississippi19CampaignId);

  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(19, await progress.loadCampaign()), 'locked');
  const unlockSessionId = 'm18-complete-for-m19';
  await progress.applySettlement({
    settlementId: `${unlockSessionId}:${mississippi18CampaignId}:8`,
    sessionId: unlockSessionId,
    scenarioId: mississippi18CampaignId,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 1_800,
    displayScore: 1_800,
    highScoreCandidate: 1_800,
  });
  assert.equal(campaignLevelState(18, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(19, await progress.loadCampaign()), 'available');
});

test('Dust Falls Free Play opens on all difficulties and replay restores every global hire unlock', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const completed = completedForMask(mask);
    const contentVersion = mississippi19CampaignContentVersionFor(completed);
    assert.equal(getBrowserScenarioContentVersion(mississippi19CampaignId, completed), contentVersion);
    const restored = mississippi19CompletedScenarioIdsForContentVersion(contentVersion);
    assert.deepEqual(restored?.sort(), completed.slice().sort());

    const content = createMississippi19CampaignContent(restored);
    for (const [bit, { type }] of unlocks.entries()) {
      assert.equal(content.units.filter((unit) => unit.type === type && unit.activity === 4).length,
        mask & (1 << bit) ? (type === 'grandpa' ? 3 : 1) : 0,
        `${type} hire marker matches unlock mask ${mask}`);
    }
    assert.equal(content.campaignUnitPool?.units.some(({ unitType }) => unitType === 'indian'), true);
    assert.equal(content.units.some(({ type, activity }) => type === 'indian' && activity === 5), false);

    const replayFactory = createBrowserGameForMississippi19Replay(contentVersion);
    const session = await replayFactory.open({
      scenarioId: mississippi19CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 1_901 + mask,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(session.observe().wave?.number, 1);
      for (const [bit, { type }] of unlocks.entries()) {
        assert.equal(session.observe().units.filter((unit) => unit.type === type && unit.activity === 4).length,
          mask & (1 << bit) ? (type === 'grandpa' ? 3 : 1) : 0);
      }
    } finally {
      session.close();
    }
  }

  assert.equal(mississippi19CompletedScenarioIdsForContentVersion('unknown-dust-falls-version'), undefined);
  assert.deepEqual(mississippi19CompletedScenarioIdsForContentVersion('gng-free-1.8.6-mississippi-19-formal-v1-grandpa1-sniper1-pyro1-salesman2'), undefined);

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await createBrowserGame([]).open({
      scenarioId: mississippi19CampaignId,
      contentVersion: mississippi19CampaignContentVersionFor([]),
      mode: 'free',
      difficulty,
      randomSeed: 1_930,
    });
    try {
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.observe().wave?.number, 1);
      assert.equal(session.observe().wave?.totalWaves, 8);
      assert.equal(session.observe().map.width, 32);
      assert.equal(session.observe().map.height, 24);
    } finally {
      session.close();
    }
  }
});

test('formal Dust Falls victory records level 19 while Free Play cannot change the profile', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent([mississippi18CampaignId]);
  const game = createGame({
    scenarios: { [mississippi19CampaignId]: content },
    sessionIdSource: () => `m19-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: [mississippi18CampaignId],
  }), officialCampaignStages);

  const formal = await game.open({
    scenarioId: mississippi19CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 1_904,
  });
  for (let frame = 0; frame < 80 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  await progress.applySettlement(victory!);
  assert.ok((await progress.exportProfileData()).completedScenarios.includes(mississippi19CampaignId));
  assert.equal(campaignLevelState(19, await progress.loadCampaign()), 'completed');
  formal.close();

  const freeContent = emptyRequestContent([mississippi18CampaignId]);
  const free = await createGame({ scenarios: { [mississippi19CampaignId]: freeContent } }).open({
    scenarioId: mississippi19CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_905,
  });
  for (let frame = 0; frame < 80 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(free.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  free.close();
});
