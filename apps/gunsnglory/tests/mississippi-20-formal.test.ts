import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi20Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createMississippi20CampaignContent } from '../src/content/mississippi-20-campaign';
import {
  mississippi20CampaignContentVersionFor,
  mississippi20CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-20-content-version';
import { mississippi20CampaignId } from '../src/content/mississippi-20-identity';
import { mississippi19CampaignId } from '../src/content/mississippi-19-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
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
  const source = createMississippi20CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

test('Horse Hills is formal level 20 and unlocks after Dust Falls', async () => {
  assert.equal(officialCampaignStages.length, 25);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 20), {
    scenarioId: mississippi20CampaignId,
    contentVersion: mississippi20CampaignContentVersionFor([]),
    title: { en: 'Horse Hills · Level 20', zh: '马丘陵 · 第 20 关' },
    globalLevel: 20,
    requiresCompletedScenarioIds: [mississippi19CampaignId],
  });
  assert.equal(createMississippi20CampaignContent().formalSettlementSupported, true);

  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(20, await progress.loadCampaign()), 'locked');
  const unlockSessionId = 'm19-complete-for-m20';
  await progress.applySettlement({
    settlementId: `${unlockSessionId}:${mississippi19CampaignId}:8`,
    sessionId: unlockSessionId,
    scenarioId: mississippi19CampaignId,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 1_900,
    displayScore: 1_900,
    highScoreCandidate: 1_900,
  });
  assert.equal(campaignLevelState(19, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(20, await progress.loadCampaign()), 'available');
});

test('Horse Hills Free Play opens all difficulties and replays restore every global hire unlock', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const completed = completedForMask(mask);
    const contentVersion = mississippi20CampaignContentVersionFor(completed);
    assert.equal(getBrowserScenarioContentVersion(mississippi20CampaignId, completed), contentVersion);
    const restored = mississippi20CompletedScenarioIdsForContentVersion(contentVersion);
    assert.deepEqual(restored?.sort(), completed.slice().sort());

    const content = createMississippi20CampaignContent(restored);
    for (const [bit, { type }] of unlocks.entries()) {
      const expectedHireCount = mask & (1 << bit) ? (type === 'grandpa' ? 3 : 1) : 0;
      assert.equal(content.units.filter((unit) => unit.type === type && unit.activity === 4).length, expectedHireCount,
        `${type} hire marker matches unlock mask ${mask}`);
    }
    assert.equal(content.campaignUnitPool?.units.some(({ unitType }) => unitType === 'indian'), true);
    assert.equal(content.units.some(({ type, activity }) => type === 'indian' && activity === 5), false);

    const replayFactory = createBrowserGameForMississippi20Replay(contentVersion);
    const session = await replayFactory.open({
      scenarioId: mississippi20CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 2_001 + mask,
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

  assert.equal(mississippi20CompletedScenarioIdsForContentVersion('unknown-horse-hills-version'), undefined);
  assert.equal(mississippi20CompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-mississippi-20-formal-v1-grandpa1-sniper1-pyro1-salesman2',
  ), undefined);

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await createBrowserGame([]).open({
      scenarioId: mississippi20CampaignId,
      contentVersion: mississippi20CampaignContentVersionFor([]),
      mode: 'free',
      difficulty,
      randomSeed: 2_030,
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

test('formal Horse Hills victory records level 20 while Free Play cannot change the profile', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent([mississippi19CampaignId]);
  const game = createGame({
    scenarios: { [mississippi20CampaignId]: content },
    sessionIdSource: () => `m20-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: [mississippi19CampaignId],
  }), officialCampaignStages);

  const formal = await game.open({
    scenarioId: mississippi20CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 2_004,
  });
  for (let frame = 0; frame < 80 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  await progress.applySettlement(victory!);
  assert.ok((await progress.exportProfileData()).completedScenarios.includes(mississippi20CampaignId));
  assert.equal(campaignLevelState(20, await progress.loadCampaign()), 'completed');
  formal.close();

  const freeContent = emptyRequestContent([mississippi19CampaignId]);
  const free = await createGame({ scenarios: { [mississippi20CampaignId]: freeContent } }).open({
    scenarioId: mississippi20CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 2_005,
  });
  for (let frame = 0; frame < 80 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(free.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  free.close();
});
