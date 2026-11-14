import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForOregon06Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createOregon06CampaignContent } from '../src/content/oregon-06-campaign';
import {
  oregon06CampaignContentVersionFor,
  oregon06CompletedScenarioIdsForContentVersion,
  parseOregon06ReplayContentVersion,
} from '../src/content/oregon-06-content-version';
import { oregon06CampaignId } from '../src/content/oregon-06-identity';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { officialCampaignStages } from '../src/content/official-campaign';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { createGame, type ScenarioContent } from '../src/game';

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
    grandpa: mask & 1 ? 3 : 0,
    pyromaniac: mask & 4 ? 1 : 0,
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
  const source = createOregon06CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave) => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({
        ...pool,
        requests: pool.requests.map(() => 0),
      })),
    })),
  };
}

test('Columbia River builder and replay factory preserve all 32 unit and Dynamite snapshot combinations', async () => {
  let cannonTemplate: unknown;
  for (let mask = 0; mask < 32; mask += 1) {
    const completed = completedForMask(mask);
    const content = createOregon06CampaignContent(completed);
    const version = oregon06CampaignContentVersionFor(completed);
    const expectedIds = expectedSnapshotIds(mask);
    const dynamiteUnlocked = Boolean(mask & (1 | 16));
    const importingProfile = completedForMask(31 - mask);

    assert.equal(content.id, oregon06CampaignId);
    assert.equal(content.contentVersion, version);
    assert.deepEqual(hireCounts(content), expectedHireCounts(mask));
    assert.deepEqual(oregon06CompletedScenarioIdsForContentVersion(version)?.sort(), expectedIds);
    assert.deepEqual(parseOregon06ReplayContentVersion(version)?.completedScenarioIds.sort(), expectedIds);
    assert.equal(content.formalSettlementSupported, true);
    assert.equal(content.campaignWaveCount, 8);
    assert.equal(content.campaignWaves?.length, 8);
    assert.equal(content.previewWave?.initialCash, 375);
    assert.equal(content.previewWave?.initialLives, 25);
    assert.equal(content.dynamite?.unlocked, dynamiteUnlocked);

    const cannon = content.campaignUnitPool?.units.find(({ poolType }) => poolType === 3);
    assert.ok(cannon?.template, 'Fort Cannon is a fixed pool template in every content snapshot');
    assert.equal(cannon?.spawnLocationType, 2);
    if (cannonTemplate === undefined) cannonTemplate = cannon.template;
    else assert.deepEqual(cannon.template, cannonTemplate, 'Cannon template is not encoded as a profile unlock');

    const importingVersion = getBrowserScenarioContentVersion(oregon06CampaignId, importingProfile);
    assert.notEqual(importingVersion, version, 'fixture importer profile differs from the recording snapshot');
    const session = await createBrowserGameForOregon06Replay(version).open({
      scenarioId: oregon06CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 26_000 + mask,
    });
    try {
      const view = session.observe();
      assert.deepEqual(hireCounts(view), expectedHireCounts(mask));
      assert.equal(view.dynamites?.length, 2);
      assert.ok(view.dynamites?.every(({ unlocked }) => unlocked === dynamiteUnlocked));
    } finally {
      session.close();
    }
  }
});

test('Columbia River replay parser rejects missing, malformed, cross-level, and noncanonical snapshots', async () => {
  assert.equal(parseOregon06ReplayContentVersion(undefined), undefined);
  assert.equal(parseOregon06ReplayContentVersion('unknown-version'), undefined);
  assert.equal(parseOregon06ReplayContentVersion('gng-free-1.8.6-oregon-06-formal-v1'), undefined);
  assert.equal(parseOregon06ReplayContentVersion(
    'gng-free-1.8.6-oregon-06-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon06ReplayContentVersion(
    'gng-free-1.8.6-oregon-05-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
  ), undefined);
  assert.equal(parseOregon06ReplayContentVersion(
    'gng-free-1.8.6-oregon-06-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
  ), undefined);
  assert.equal(parseOregon06ReplayContentVersion(
    'gng-free-1.8.6-oregon-06-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0-extra',
  ), undefined);

  assert.equal(
    getBrowserScenarioContentVersion(oregon06CampaignId, ['campaign-mississippi-10']),
    oregon06CampaignContentVersionFor(['campaign-mississippi-10']),
  );
  assert.equal(
    getBrowserScenarioContentVersion('campaign-oregon-06', []),
    oregon06CampaignContentVersionFor([]),
    'browser bootstrap recognizes this scenario identity for versioned replay exports',
  );
  await assert.rejects(
    createBrowserGameForOregon06Replay(undefined).open({
      scenarioId: oregon06CampaignId,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 26_032,
    }),
    (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
    'an unsupported replay version must leave the scenario unavailable instead of using the current profile',
  );
});

test('Columbia River unlocks after level 25, keeps Free Play outside profile progress, and records formal victory', async () => {
  assert.equal(officialCampaignStages.length, 26);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 26), {
    scenarioId: oregon06CampaignId,
    contentVersion: oregon06CampaignContentVersionFor([]),
    title: { en: 'Columbia River · Level 26', zh: '哥伦比亚河 · 第 26 关' },
    globalLevel: 26,
    requiresCompletedScenarioIds: ['campaign-oregon-05'],
  });

  const lockedProgress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(26, await lockedProgress.loadCampaign()), 'locked');

  const progress = createProgress(
    createMemoryProfileRepository({ completedScenarios: ['campaign-oregon-05'] }),
    officialCampaignStages,
  );
  assert.equal(campaignLevelState(26, await progress.loadCampaign()), 'available');
  const profileBeforeFreePlay = await progress.exportProfileData();
  const freeContent = emptyRequestContent(['campaign-oregon-05']);
  const free = await createGame({ scenarios: { [oregon06CampaignId]: freeContent } }).open({
    scenarioId: oregon06CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 26_100,
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

  const formalContent = emptyRequestContent(['campaign-oregon-05']);
  const formal = await createGame({ scenarios: { [oregon06CampaignId]: formalContent } }).open({
    scenarioId: oregon06CampaignId,
    contentVersion: formalContent.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 26_101,
  });
  try {
    for (let frame = 0; frame < 240 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
    const victory = formal.terminalRecord();
    assert.equal(victory?.outcome, 'victory');
    assert.equal(victory?.mode, 'formal');
    await progress.applySettlement(victory!);
    const saved = await progress.exportProfileData();
    assert.ok(saved.completedScenarios.includes(oregon06CampaignId));
    assert.equal(saved.highScores[oregon06CampaignId], victory?.highScoreCandidate);
    assert.ok(saved.appliedSettlementIds.includes(victory!.settlementId));
    assert.equal(campaignLevelState(26, await progress.loadCampaign()), 'completed');
  } finally {
    formal.close();
  }
});
