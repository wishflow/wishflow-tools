import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi18Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createMississippi18CampaignContent } from '../src/content/mississippi-18-campaign';
import {
  mississippi18CampaignContentVersionFor,
  mississippi18CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-18-content-version';
import { mississippi18CampaignId } from '../src/content/mississippi-18-identity';
import { mississippi17CampaignId } from '../src/content/mississippi-17-identity';
import { mississippi18LevelEighteenCampaignContent, officialCampaignStages } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const pyromaniacUnlock = 'campaign-nevada-10';
const salesmanUnlock = 'campaign-alaska-10';
const sniperUnlock = 'campaign-dakota-10';
const grandpaUnlock = 'campaign-oregon-10';
const dynamiteUnlock = 'campaign-mississippi-10';
const completedThroughLevelSixteen = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 6 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
];
const completedThroughLevelSeventeen = [...completedThroughLevelSixteen, mississippi17CampaignId];

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createMississippi18CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

test('Shadow Town is formal level 18 and requires Dead Rocks completion', async () => {
  assert.equal(officialCampaignStages.length, 25);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 18), {
    scenarioId: mississippi18CampaignId,
    contentVersion: mississippi18CampaignContentVersionFor([]),
    title: { en: 'Shadow Town · Level 18', zh: '影镇 · 第 18 关' },
    globalLevel: 18,
    requiresCompletedScenarioIds: [mississippi17CampaignId],
  });
  assert.equal(mississippi18LevelEighteenCampaignContent.formalSettlementSupported, true);
  assert.equal(mississippi18LevelEighteenCampaignContent.id, mississippi18CampaignId);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelSixteen,
  }), officialCampaignStages);
  assert.equal(campaignLevelState(17, await progress.loadCampaign()), 'available');
  assert.equal(campaignLevelState(18, await progress.loadCampaign()), 'locked');
  await progress.applySettlement({
    settlementId: `m18-unlock-after-m17:${mississippi17CampaignId}:8`,
    sessionId: 'm18-unlock-after-m17',
    scenarioId: mississippi17CampaignId,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 1_800,
    displayScore: 1_800,
    highScoreCandidate: 1_800,
  });
  assert.equal(campaignLevelState(17, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(18, await progress.loadCampaign()), 'available');
});

test('registered Shadow Town opens in Free Play at each difficulty with the recorded unlock snapshot', async () => {
  const completed = [pyromaniacUnlock, salesmanUnlock, sniperUnlock, grandpaUnlock, dynamiteUnlock];
  const contentVersion = mississippi18CampaignContentVersionFor(completed);
  assert.equal(getBrowserScenarioContentVersion(mississippi18CampaignId, completed), contentVersion);
  assert.deepEqual(mississippi18CompletedScenarioIdsForContentVersion(contentVersion)?.sort(), [...completed].sort());

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const session = await createBrowserGame(completed).open({
      scenarioId: mississippi18CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 1_801,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 8);
      assert.equal(view.wave?.cash, 425);
      assert.equal(view.wave?.lives, 20);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.ok(view.units.some(({ type, activity }) => type === 'gunslinger' && activity === 5));
      assert.ok(view.units.some(({ type }) => type === 'pyromaniac'));
      assert.ok(view.units.some(({ type }) => type === 'salesman'));
      assert.equal(view.dynamites?.length, 1);
      assert.ok(!view.units.some(({ type }) => type === 'cannon'), 'no initial Cannon is fabricated for the Fort pool');
    } finally {
      session.close();
    }
  }
});

test('Shadow Town replay versions restore each unit-unlock flag and Dynamite visibility', async () => {
  const snapshots = [
    { completed: [], expectedUnits: [], dynamite: false },
    { completed: [grandpaUnlock], expectedUnits: [], dynamite: true },
    { completed: [sniperUnlock], expectedUnits: [], dynamite: false },
    { completed: [pyromaniacUnlock], expectedUnits: ['pyromaniac'], dynamite: false },
    { completed: [salesmanUnlock], expectedUnits: ['salesman'], dynamite: false },
    { completed: [grandpaUnlock, sniperUnlock, pyromaniacUnlock, salesmanUnlock, dynamiteUnlock], expectedUnits: [
      'salesman', 'pyromaniac',
    ], dynamite: true },
  ] as const;

  for (const snapshot of snapshots) {
    const version = mississippi18CampaignContentVersionFor(snapshot.completed);
    assert.equal(getBrowserScenarioContentVersion(mississippi18CampaignId, snapshot.completed), version);
    const restored = mississippi18CompletedScenarioIdsForContentVersion(version);
    assert.ok(restored);
    assert.equal(createMississippi18CampaignContent(restored).dynamite?.unlocked, snapshot.dynamite);
    assert.deepEqual(createMississippi18CampaignContent(restored).units
      .filter(({ type }) => ['pyromaniac', 'salesman'].includes(type))
      .map(({ type }) => type).sort(), [...snapshot.expectedUnits].sort());
    const replayFactory = createBrowserGameForMississippi18Replay(version);
    const session = await replayFactory.open({
      scenarioId: mississippi18CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 1_803,
    });
    try {
      assert.equal(session.observe().dynamites?.[0]?.unlocked, snapshot.dynamite);
      assert.equal(session.observe().units.filter(({ type, activity }) => type === 'mexican' && activity === 4).length, 4);
      assert.equal(session.observe().units.filter(({ type, activity }) => type === 'indian' && activity === 4).length, 5);
      const completed = new Set<string>(snapshot.completed);
      assert.equal(session.observe().units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
        completed.has(sniperUnlock) ? 1 : 0);
      assert.equal(session.observe().units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
        completed.has(grandpaUnlock) ? 2 : 0);
      assert.deepEqual(session.observe().units
        .filter(({ type }) => ['pyromaniac', 'salesman'].includes(type))
        .map(({ type }) => type).sort(), [...snapshot.expectedUnits].sort());
    } finally {
      session.close();
    }
  }
  assert.equal(mississippi18CompletedScenarioIdsForContentVersion('unknown-shadow-town-version'), undefined);
});

test('Shadow Town v1 replay retains its recorded base-unit set while v2 uses current TDM hires', async () => {
  const legacyVersion = 'gng-free-1.8.6-mississippi-18-formal-v1-grandpa1-sniper1-pyro1-salesman1-dynamite1';
  const legacyCompleted = [grandpaUnlock, sniperUnlock, pyromaniacUnlock, salesmanUnlock, dynamiteUnlock];
  assert.deepEqual(
    mississippi18CompletedScenarioIdsForContentVersion(legacyVersion)?.sort(),
    legacyCompleted.slice().sort(),
  );

  const session = await createBrowserGameForMississippi18Replay(legacyVersion).open({
    scenarioId: mississippi18CampaignId,
    contentVersion: legacyVersion,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 1_806,
  });
  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, legacyVersion);
    assert.equal(view.dynamites?.[0]?.unlocked, true);
    assert.equal(view.units.filter(({ type, activity }) => type === 'mexican' && activity === 4).length, 0);
    assert.equal(view.units.filter(({ type, activity }) => type === 'indian' && activity === 4).length, 0);
    assert.equal(view.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length, 0);
    assert.equal(view.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length, 0);
    assert.ok(view.units.some(({ type, activity }) => type === 'pyromaniac' && activity === 4));
    assert.ok(view.units.some(({ type, activity }) => type === 'salesman' && activity === 4));
  } finally {
    session.close();
  }
});

test('formal Shadow Town victory writes level 18 while Free Play stays outside the profile', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent(completedThroughLevelSeventeen);
  const game = createGame({
    scenarios: { [mississippi18CampaignId]: content },
    sessionIdSource: () => `m18-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelSeventeen,
  }), officialCampaignStages);

  const formal = await game.open({
    scenarioId: mississippi18CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 1_804,
  });
  for (let frame = 0; frame < 80 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  await progress.applySettlement(victory!);
  assert.ok((await progress.exportProfileData()).completedScenarios.includes(mississippi18CampaignId));
  assert.equal(campaignLevelState(18, await progress.loadCampaign()), 'completed');
  formal.close();

  const freeContent = emptyRequestContent(completedThroughLevelSeventeen);
  const free = await createGame({ scenarios: { [mississippi18CampaignId]: freeContent } }).open({
    scenarioId: mississippi18CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_805,
  });
  for (let frame = 0; frame < 80 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(free.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  free.close();
});
