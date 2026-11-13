import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForOregon02Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createOregon02CampaignContent } from '../src/content/oregon-02-campaign';
import {
  oregon02CampaignContentVersionFor,
  oregon02CompletedScenarioIdsForContentVersion,
  parseOregon02ReplayContentVersion,
} from '../src/content/oregon-02-content-version';
import { oregon02CampaignId } from '../src/content/oregon-02-identity';
import { oregon01CampaignId } from '../src/content/oregon-01-identity';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const unitUnlockScenarioIds = ['campaign-nevada-10', 'campaign-alaska-10'] as const;

function completedForMask(mask: number): string[] {
  return unitUnlockScenarioIds.flatMap((scenarioId, bit) => mask & (1 << bit) ? [scenarioId] : []);
}

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon02CampaignContent(completedScenarioIds);
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

function hireCounts(content: ScenarioContent): { pyromaniac: number; salesman: number } {
  return {
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
  };
}

test('Cashcow Canyon is formal level 22 and unlocks after Eastwood Forest', async () => {
  assert.equal(officialCampaignStages.length, 22);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 22), {
    scenarioId: oregon02CampaignId,
    contentVersion: oregon02CampaignContentVersionFor([]),
    title: { en: 'Cashcow Canyon · Level 22', zh: '金牛峡谷 · 第 22 关' },
    globalLevel: 22,
    requiresCompletedScenarioIds: [oregon01CampaignId],
  });

  const lockedProgress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(22, await lockedProgress.loadCampaign()), 'locked');

  const unlockedProgress = createProgress(createMemoryProfileRepository({
    completedScenarios: [oregon01CampaignId],
  }), officialCampaignStages);
  assert.equal(campaignLevelState(22, await unlockedProgress.loadCampaign()), 'available');
});

test('Cashcow replays preserve both gated hire markers in all four profile snapshots', async () => {
  for (let mask = 0; mask < 4; mask += 1) {
    const completed = completedForMask(mask);
    const contentVersion = oregon02CampaignContentVersionFor(completed);
    assert.equal(getBrowserScenarioContentVersion(oregon02CampaignId, completed), contentVersion);
    assert.deepEqual(
      oregon02CompletedScenarioIdsForContentVersion(contentVersion)?.sort(),
      completed.slice().sort(),
    );

    const expected = {
      pyromaniac: mask & 1 ? 1 : 0,
      salesman: mask & 2 ? 1 : 0,
    };
    assert.deepEqual(hireCounts(createOregon02CampaignContent(completed)), expected);

    const session = await createBrowserGameForOregon02Replay(contentVersion).open({
      scenarioId: oregon02CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 22_100 + mask,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 9);
      assert.deepEqual(hireCounts({ ...createOregon02CampaignContent(completed), units: view.units }), expected);
    } finally {
      session.close();
    }
  }

  assert.equal(parseOregon02ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon02ReplayContentVersion(
    'gng-free-1.8.6-oregon-02-formal-v1-grandpa0-sniper0-pyro2-salesman0',
  ), undefined);
  const unsupportedSource = await createGame({
    scenarios: { [oregon02CampaignId]: emptyRequestContent([]) },
    sessionIdSource: () => 'cashcow-unsupported-version-source',
  }).open({
    scenarioId: oregon02CampaignId,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 22_199,
  });
  try {
    for (let frame = 0; frame < 120 && !unsupportedSource.terminalRecord(); frame += 1) {
      unsupportedSource.advance({ deltaMs: 0 });
    }
    const serialized = await unsupportedSource.exportReplay();
    await assert.rejects(
      createBrowserGameForOregon02Replay('unknown-version').replay(serialized),
      (error: unknown) => (error as { code?: string }).code === 'content-unavailable',
    );
  } finally {
    unsupportedSource.close();
  }
});

test('Cashcow opens at every Free Play difficulty and formal-only victory updates progress', async () => {
  const completedBefore = [oregon01CampaignId];
  const profileRepository = createMemoryProfileRepository({ completedScenarios: completedBefore });
  const progress = createProgress(profileRepository, officialCampaignStages);
  const beforeFreePlay = await progress.exportProfileData();

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const completed = completedForMask(0);
    const content = createOregon02CampaignContent(completed);
    const session = await createBrowserGame(completed).open({
      scenarioId: oregon02CampaignId,
      contentVersion: content.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 22_300,
    });
    try {
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.observe().wave?.number, 1);
      assert.equal(session.observe().wave?.totalWaves, 9);
    } finally {
      session.close();
    }
  }
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlay);

  let sessionNumber = 0;
  const formalContent = emptyRequestContent(completedBefore);
  const game = createGame({
    scenarios: { [oregon02CampaignId]: formalContent },
    sessionIdSource: () => `m23-cashcow-settlement-${++sessionNumber}`,
  });
  const formal = await game.open({
    scenarioId: oregon02CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 22_301,
  });
  try {
    for (let frame = 0; frame < 120 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
    const victory = formal.terminalRecord();
    assert.equal(victory?.outcome, 'victory');
    assert.equal(victory?.mode, 'formal');
    await progress.applySettlement(victory!);
    const afterFormal = await progress.exportProfileData();
    assert.ok(afterFormal.completedScenarios.includes(oregon02CampaignId));
    assert.equal(campaignLevelState(22, await progress.loadCampaign()), 'completed');

    const free = await createGame({ scenarios: { [oregon02CampaignId]: emptyRequestContent(completedBefore) } }).open({
      scenarioId: oregon02CampaignId,
      contentVersion: formalContent.contentVersion,
      mode: 'free',
      difficulty: 'hard',
      randomSeed: 22_302,
    });
    try {
      for (let frame = 0; frame < 120 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
      assert.equal(free.terminalRecord()?.mode, 'free');
      await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
      assert.deepEqual(await progress.exportProfileData(), afterFormal);
    } finally {
      free.close();
    }
  } finally {
    formal.close();
  }
});
