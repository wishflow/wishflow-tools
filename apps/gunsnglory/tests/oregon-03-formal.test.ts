import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForOregon03Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createOregon03CampaignContent } from '../src/content/oregon-03-campaign';
import {
  oregon03CampaignContentVersionFor,
  oregon03CompletedScenarioIdsForContentVersion,
  parseOregon03ReplayContentVersion,
} from '../src/content/oregon-03-content-version';
import { oregon03CampaignId } from '../src/content/oregon-03-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { oregon02CampaignId } from '../src/content/oregon-02-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const unlockScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;

function completedForMask(mask: number): string[] {
  return unlockScenarioIds.flatMap((scenarioId, bit) => (mask & (1 << bit)) ? [scenarioId] : []);
}

function expectedHireCounts(mask: number) {
  return {
    sniper: mask & 2 ? 1 : 0,
    grandpa: mask & 1 ? 8 : 0,
    pyromaniac: mask & 4 ? 1 : 0,
    salesman: mask & 8 ? 1 : 0,
  };
}

function hireCounts(content: ReturnType<typeof createOregon03CampaignContent>) {
  return {
    sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
    grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
  };
}

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon03CampaignContent(completedScenarioIds);
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

test('Chinook Woods content factory and replay version preserve all 16 global hire snapshots', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const completed = completedForMask(mask);
    const content = createOregon03CampaignContent(completed);
    const version = oregon03CampaignContentVersionFor(completed);
    const expectedIds = completed.slice().sort();

    assert.equal(content.id, oregon03CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(hireCounts(content), expectedHireCounts(mask));
    assert.deepEqual(oregon03CompletedScenarioIdsForContentVersion(version)?.sort(), expectedIds);
    assert.deepEqual(parseOregon03ReplayContentVersion(version)?.completedScenarioIds.sort(), expectedIds);
    assert.equal(getBrowserScenarioContentVersion(oregon03CampaignId, completed), version);
    assert.deepEqual(content.campaignUnitPool?.units.map(({ poolType, unitType, template }) => [
      poolType, unitType, template?.type,
    ]), [[4, 'indian', 'indian']], 'the fixed Tipi pool is present in every profile snapshot');

    const session = await createGame({ scenarios: { [content.id]: content } }).open({
      scenarioId: content.id,
      contentVersion: version,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 23_000 + mask,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.contentVersion, version);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(view.wave?.totalWaves, 9);
      assert.deepEqual(hireCounts({ ...content, units: view.units }), expectedHireCounts(mask));
    } finally {
      session.close();
    }

    const replaySession = await createBrowserGameForOregon03Replay(version).open({
      scenarioId: oregon03CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 24_000 + mask,
    });
    try {
      assert.deepEqual(hireCounts({ ...content, units: replaySession.observe().units }), expectedHireCounts(mask));
    } finally {
      replaySession.close();
    }
  }
});

test('Chinook Woods replay content version rejects unknown, malformed, and cross-level snapshots', () => {
  assert.equal(parseOregon03ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon03ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon03ReplayContentVersion('gng-free-1.8.6-oregon-03-formal-v1'), undefined);
  assert.equal(parseOregon03ReplayContentVersion(
    'gng-free-1.8.6-oregon-03-formal-v1-grandpa2-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseOregon03ReplayContentVersion(
    'gng-free-1.8.6-oregon-02-formal-v1-grandpa0-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseOregon03ReplayContentVersion(
    'gng-free-1.8.6-oregon-03-formal-v1-grandpa0-sniper0-pyro0-salesman0-extra',
  ), undefined);
});

test('Chinook Woods is formal level 23, unlocks after Cashcow, and Free Play does not write progress', async () => {
  assert.equal(officialCampaignStages.length, 25);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 23), {
    scenarioId: oregon03CampaignId,
    contentVersion: oregon03CampaignContentVersionFor([]),
    title: { en: 'Chinook Woods · Level 23', zh: '奇努克森林 · 第 23 关' },
    globalLevel: 23,
    requiresCompletedScenarioIds: [oregon02CampaignId],
  });

  const lockedProgress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(23, await lockedProgress.loadCampaign()), 'locked');
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: [oregon02CampaignId] }), officialCampaignStages);
  assert.equal(campaignLevelState(23, await progress.loadCampaign()), 'available');
  const profileBefore = await progress.exportProfileData();

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const completed = [oregon02CampaignId];
    const contentVersion = getBrowserScenarioContentVersion(oregon03CampaignId, completed);
    const session = await createBrowserGame(completed).open({
      scenarioId: oregon03CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 23_300,
    });
    try {
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.observe().wave?.number, 1);
      assert.equal(session.observe().wave?.totalWaves, 9);
      assert.deepEqual(await progress.exportProfileData(), profileBefore);
    } finally {
      session.close();
    }
  }

  const completedBefore = [oregon02CampaignId];
  const formalContent = emptyRequestContent(completedBefore);
  const formal = await createGame({
    scenarios: { [oregon03CampaignId]: formalContent },
    sessionIdSource: () => 'm24-chinook-settlement',
  }).open({
    scenarioId: oregon03CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 23_301,
  });
  try {
    for (let frame = 0; frame < 120 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
    const victory = formal.terminalRecord();
    assert.equal(victory?.outcome, 'victory');
    await progress.applySettlement(victory!);
    assert.equal(campaignLevelState(23, await progress.loadCampaign()), 'completed');
    assert.ok((await progress.exportProfileData()).completedScenarios.includes(oregon03CampaignId));
  } finally {
    formal.close();
  }
});
