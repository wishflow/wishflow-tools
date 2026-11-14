import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForOregon04Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createOregon04CampaignContent } from '../src/content/oregon-04-campaign';
import {
  oregon04CampaignContentVersionFor,
  oregon04CompletedScenarioIdsForContentVersion,
  parseOregon04ReplayContentVersion,
} from '../src/content/oregon-04-content-version';
import { oregon04CampaignCopy } from '../src/content/oregon-04-campaign-copy';
import { oregon04CampaignId } from '../src/content/oregon-04-identity';
import { oregon03CampaignId } from '../src/content/oregon-03-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import {
  GAME_REPLAY_FORMAT_VERSION,
  GAME_RULES_VERSION,
  serializeReplay,
  type GameReplayPayload,
} from '../src/game/replay';
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

function hireCounts(content: { units: readonly { type: string; activity?: number }[] }) {
  return {
    sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
    grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
  };
}

async function replayFixture(contentVersion?: string): Promise<string> {
  const digest = `sha256:${'0'.repeat(64)}`;
  const startRecord = {
    sessionId: 'fort-echo-replay-fixture',
    scenarioId: oregon04CampaignId,
    ...(contentVersion === undefined ? {} : { contentVersion }),
    rulesVersion: GAME_RULES_VERSION,
    randomAlgorithm: 'java.util.Random' as const,
    randomSeed: 27_404,
    mode: 'free' as const,
  };
  return serializeReplay({
    formatVersion: GAME_REPLAY_FORMAT_VERSION,
    rulesVersion: GAME_RULES_VERSION,
    startRecord: startRecord as GameReplayPayload['startRecord'],
    frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
    checkpoints: [{ frame: 0, stateDigest: digest }, { frame: 1, stateDigest: digest }],
    terminal: {
      frame: 1,
      settlement: { outcome: 'victory', scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
      stateDigest: digest,
    },
  });
}

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon04CampaignContent(completedScenarioIds);
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

test('Fort Echo builder and canonical content version preserve all 16 global hire snapshots', () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const completed = completedForMask(mask);
    const content = createOregon04CampaignContent(completed);
    const version = oregon04CampaignContentVersionFor(completed);
    const expectedIds = completed.slice().sort();

    assert.equal(content.id, oregon04CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(hireCounts(content), expectedHireCounts(mask));
    assert.deepEqual(oregon04CompletedScenarioIdsForContentVersion(version)?.sort(), expectedIds);
    assert.deepEqual(parseOregon04ReplayContentVersion(version)?.completedScenarioIds.sort(), expectedIds);
    assert.equal(content.formalSettlementSupported, true);
    assert.equal(content.campaignWaveCount, 10);
    assert.equal(content.campaignWaves?.length, 10);
    assert.deepEqual(content.campaignUnitPool?.units.map(({ poolType, unitType, template }) => [
      poolType, unitType, template?.type,
    ]), [[3, 'cannon', 'cannon']], 'the fixed Fort Cannon pool is independent of the global hire snapshot');
  }
});

test('Fort Echo content versions reject unknown, malformed, cross-level, and noncanonical snapshots', () => {
  assert.equal(parseOregon04ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon04ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon04ReplayContentVersion('gng-free-1.8.6-oregon-04-formal-v1'), undefined);
  assert.equal(parseOregon04ReplayContentVersion(
    'gng-free-1.8.6-oregon-04-formal-v1-grandpa2-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseOregon04ReplayContentVersion(
    'gng-free-1.8.6-oregon-03-formal-v1-grandpa0-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseOregon04ReplayContentVersion(
    'gng-free-1.8.6-oregon-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-extra',
  ), undefined);
});

test('Fort Echo browser replay factory restores the recorded hire snapshot instead of the importing profile', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const recordedProfile = completedForMask(mask);
    const importingProfile = completedForMask(15 - mask);
    const contentVersion = oregon04CampaignContentVersionFor(recordedProfile);

    assert.equal(getBrowserScenarioContentVersion(oregon04CampaignId, recordedProfile), contentVersion);
    const importingContentVersion = getBrowserScenarioContentVersion(oregon04CampaignId, importingProfile);
    assert.notEqual(
      importingContentVersion,
      contentVersion,
      'fixture importing profile differs from the replay snapshot',
    );

    const currentProfileSession = await createBrowserGame(importingProfile).open({
      scenarioId: oregon04CampaignId,
      contentVersion: importingContentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 27_400 + mask,
    });
    try {
      assert.deepEqual(hireCounts(currentProfileSession.observe()), expectedHireCounts(15 - mask));
      assert.notDeepEqual(hireCounts(currentProfileSession.observe()), expectedHireCounts(mask));
    } finally {
      currentProfileSession.close();
    }

    const session = await createBrowserGameForOregon04Replay(contentVersion).open({
      scenarioId: oregon04CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 27_500 + mask,
    });
    try {
      assert.deepEqual(hireCounts(session.observe()), expectedHireCounts(mask));
    } finally {
      session.close();
    }
  }
});

test('Fort Echo replay factory rejects missing and unsupported recorded content versions', async () => {
  const missingVersionReplay = await replayFixture();
  await assert.rejects(
    createBrowserGameForOregon04Replay(undefined).replay(missingVersionReplay),
    (error: unknown) => (error as { code?: string }).code === 'missing-version',
  );

  const invalidVersions = [
    'unknown-version',
    'gng-free-1.8.6-oregon-04-formal-v1-grandpa2-sniper0-pyro0-salesman0',
    'gng-free-1.8.6-oregon-03-formal-v1-grandpa0-sniper0-pyro0-salesman0',
    'gng-free-1.8.6-oregon-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-extra',
  ];
  for (const contentVersion of invalidVersions) {
    await assert.rejects(
      createBrowserGameForOregon04Replay(contentVersion).replay(await replayFixture(contentVersion)),
      (error: unknown) => (error as { code?: string }).code === 'content-unavailable',
      `Fort Echo must not fall back for ${contentVersion}`,
    );
  }
});

test('Fort Echo content builder opens a short GameSession with its source map and starting rules', async () => {
  const content = createOregon04CampaignContent();
  const session = await createGame({ scenarios: { [content.id]: content } }).open({
    scenarioId: content.id,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'medium',
    randomSeed: 2729,
  });

  try {
    const view = session.observe();
    assert.equal(view.map.width, 32);
    assert.equal(view.map.height, 24);
    assert.equal(view.wave?.number, 1);
    assert.equal(view.wave?.totalWaves, 10);
    assert.equal(view.wave?.cash, 250);
    assert.equal(view.wave?.lives, 25);
  } finally {
    session.close();
  }
});

test('Fort Echo is formal level 24 after Chinook Woods; Free Play stays isolated from campaign progress', async () => {
  assert.equal(officialCampaignStages.length, 26);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 24), {
    scenarioId: oregon04CampaignId,
    contentVersion: oregon04CampaignContentVersionFor([]),
    title: {
      en: `${oregon04CampaignCopy.title.en} · Level 24`,
      zh: `${oregon04CampaignCopy.title.zh} · 第 24 关`,
    },
    globalLevel: 24,
    requiresCompletedScenarioIds: [oregon03CampaignId],
  });

  const lockedProgress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(24, await lockedProgress.loadCampaign()), 'locked');

  const completedBefore = [oregon03CampaignId];
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: completedBefore }), officialCampaignStages);
  assert.equal(campaignLevelState(24, await progress.loadCampaign()), 'available');
  const profileBeforeFreePlay = await progress.exportProfileData();

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const freeContent = emptyRequestContent(completedBefore);
    const free = await createGame({
      scenarios: { [oregon04CampaignId]: freeContent },
      sessionIdSource: () => `fort-echo-free-${difficulty}`,
    }).open({
      scenarioId: oregon04CampaignId,
      contentVersion: freeContent.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 27_600 + index,
    });
    try {
      for (let frame = 0; frame < 240 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
      const freeSettlement = free.terminalRecord();
      assert.equal(freeSettlement?.outcome, 'victory');
      assert.equal(freeSettlement?.mode, 'free');
      await assert.rejects(
        progress.applySettlement(freeSettlement!),
        /Progress only accepts formal game settlements/,
      );
      assert.deepEqual(await progress.exportProfileData(), profileBeforeFreePlay);
    } finally {
      free.close();
    }
  }

  const formalContent = emptyRequestContent(completedBefore);
  const formal = await createGame({
    scenarios: { [oregon04CampaignId]: formalContent },
    sessionIdSource: () => 'fort-echo-formal-settlement',
  }).open({
    scenarioId: oregon04CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 27_610,
  });
  try {
    for (let frame = 0; frame < 240 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
    const victory = formal.terminalRecord();
    assert.equal(victory?.outcome, 'victory');
    assert.equal(victory?.mode, 'formal');
    await progress.applySettlement(victory!);

    const saved = await progress.exportProfileData();
    assert.ok(saved.completedScenarios.includes(oregon04CampaignId));
    assert.equal(saved.highScores[oregon04CampaignId], victory?.highScoreCandidate);
    assert.ok(saved.appliedSettlementIds.includes(victory!.settlementId));
    assert.equal(campaignLevelState(24, await progress.loadCampaign()), 'completed');
  } finally {
    formal.close();
  }
});
