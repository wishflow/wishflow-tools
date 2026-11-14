import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForOregon05Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createOregon05CampaignContent } from '../src/content/oregon-05-campaign';
import {
  oregon05CampaignContentVersionFor,
  oregon05CompletedScenarioIdsForContentVersion,
  parseOregon05ReplayContentVersion,
} from '../src/content/oregon-05-content-version';
import { oregon05CampaignCopy } from '../src/content/oregon-05-campaign-copy';
import { oregon05CampaignId } from '../src/content/oregon-05-identity';
import { createOregon05Dynamite } from '../src/content/oregon-05-dynamite';
import { oregon04CampaignId } from '../src/content/oregon-04-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const unitUnlockScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;
const dynamiteUnlockScenarioId = 'campaign-mississippi-10';

function completedForMask(mask: number): string[] {
  return [
    ...unitUnlockScenarioIds.flatMap((scenarioId, bit) => (mask & (1 << bit) ? [scenarioId] : [])),
    ...(mask & 16 ? [dynamiteUnlockScenarioId] : []),
  ];
}

function expectedHireCounts(mask: number) {
  return {
    sniper: mask & 2 ? 1 : 0,
    grandpa: mask & 1 ? 5 : 0,
    pyromaniac: mask & 4 ? 2 : 0,
    salesman: mask & 8 ? 1 : 0,
  };
}

function expectedSnapshotIds(mask: number): string[] {
  return [
    ...unitUnlockScenarioIds.flatMap((scenarioId, bit) => (mask & (1 << bit) ? [scenarioId] : [])),
    ...(mask & (1 | 16) ? [dynamiteUnlockScenarioId] : []),
  ].sort();
}

function hireCounts(content: { units: readonly { type: string; activity?: number }[] }) {
  return {
    sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
    grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
  };
}

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon05CampaignContent(completedScenarioIds);
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

test('Dynamite Plains builder canonicalizes all 32 unit and Dynamite completion combinations', async () => {
  for (let mask = 0; mask < 32; mask += 1) {
    const completed = completedForMask(mask);
    const content = createOregon05CampaignContent(completed);
    const version = oregon05CampaignContentVersionFor(completed);
    const expectedIds = expectedSnapshotIds(mask);
    const dynamiteUnlocked = Boolean(mask & (1 | 16));
    const profile = completedForMask(31 - mask);

    assert.equal(content.id, oregon05CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(hireCounts(content), expectedHireCounts(mask));
    assert.deepEqual(oregon05CompletedScenarioIdsForContentVersion(version)?.sort(), expectedIds);
    assert.deepEqual(parseOregon05ReplayContentVersion(version)?.completedScenarioIds.sort(), expectedIds);
    assert.equal(content.formalSettlementSupported, true);
    assert.equal(content.campaignWaveCount, 9);
    assert.equal(content.campaignWaves?.length, 9);
    assert.equal(content.previewWave?.initialCash, 65);
    assert.equal(content.previewWave?.initialLives, 1);
    assert.equal(content.dynamite?.unlocked, dynamiteUnlocked);

    const importingVersion = getBrowserScenarioContentVersion(oregon05CampaignId, profile);
    assert.notEqual(importingVersion, version, 'fixture importer profile differs from the recording snapshot');
    const session = await createBrowserGameForOregon05Replay(version).open({
      scenarioId: oregon05CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 25_000 + mask,
    });
    try {
      const view = session.observe();
      assert.deepEqual(hireCounts(view), expectedHireCounts(mask));
      assert.equal(view.dynamites?.length, 3);
      assert.ok(view.dynamites?.every(({ unlocked }) => unlocked === dynamiteUnlocked));
    } finally {
      session.close();
    }
  }
});

test('Dynamite Plains replay versions reject missing, malformed, cross-level, and noncanonical snapshots', () => {
  assert.equal(parseOregon05ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon05ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon05ReplayContentVersion('gng-free-1.8.6-oregon-05-formal-v1'), undefined);
  assert.equal(parseOregon05ReplayContentVersion(
    'gng-free-1.8.6-oregon-05-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon05ReplayContentVersion(
    'gng-free-1.8.6-oregon-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon05ReplayContentVersion(
    'gng-free-1.8.6-oregon-05-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
  ), undefined);
  assert.equal(parseOregon05ReplayContentVersion(
    'gng-free-1.8.6-oregon-05-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0-extra',
  ), undefined);
});

test('Dynamite Plains is formal level 25 after Fort Echo; Free Play cannot write campaign progress', async () => {
  assert.equal(officialCampaignStages.length, 26);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 25), {
    scenarioId: oregon05CampaignId,
    contentVersion: oregon05CampaignContentVersionFor([]),
    title: {
      en: `${oregon05CampaignCopy.title.en} · Level 25`,
      zh: `${oregon05CampaignCopy.title.zh} · 第 25 关`,
    },
    globalLevel: 25,
    requiresCompletedScenarioIds: [oregon04CampaignId],
  });

  const lockedProgress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(25, await lockedProgress.loadCampaign()), 'locked');

  const completedBefore = [oregon04CampaignId];
  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: completedBefore }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(25, await progress.loadCampaign()), 'available');
  const profileBeforeFreePlay = await progress.exportProfileData();

  for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
    const freeContent = emptyRequestContent(completedBefore);
    const free = await createGame({
      scenarios: { [oregon05CampaignId]: freeContent },
      sessionIdSource: () => `dynamite-plains-free-${difficulty}`,
    }).open({
      scenarioId: oregon05CampaignId,
      contentVersion: freeContent.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 25_100 + index,
    });
    try {
      for (let frame = 0; frame < 240 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
      const settlement = free.terminalRecord();
      assert.equal(settlement?.outcome, 'victory');
      assert.equal(settlement?.mode, 'free');
      await assert.rejects(progress.applySettlement(settlement!), /Progress only accepts formal game settlements/);
      assert.deepEqual(await progress.exportProfileData(), profileBeforeFreePlay);
    } finally {
      free.close();
    }
  }

  const formalContent = emptyRequestContent(completedBefore);
  const formal = await createGame({
    scenarios: { [oregon05CampaignId]: formalContent },
    sessionIdSource: () => 'dynamite-plains-formal-settlement',
  }).open({
    scenarioId: oregon05CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 25_110,
  });
  try {
    for (let frame = 0; frame < 240 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
    const victory = formal.terminalRecord();
    assert.equal(victory?.outcome, 'victory');
    assert.equal(victory?.mode, 'formal');
    await progress.applySettlement(victory!);

    const saved = await progress.exportProfileData();
    assert.ok(saved.completedScenarios.includes(oregon05CampaignId));
    assert.equal(saved.highScores[oregon05CampaignId], victory?.highScoreCandidate);
    assert.ok(saved.appliedSettlementIds.includes(victory!.settlementId));
    assert.equal(campaignLevelState(25, await progress.loadCampaign()), 'completed');
  } finally {
    formal.close();
  }
});

test('Dynamite Plains builder installs the APK-derived dynamite pairs from its map definition', () => {
  const content = createOregon05CampaignContent();
  assert.deepEqual(content.dynamite, createOregon05Dynamite([]));
  assert.equal(content.dynamite?.pairs.length, 3);
});
