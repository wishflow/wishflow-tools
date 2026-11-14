import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForOregon01Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createOregon01CampaignContent } from '../src/content/oregon-01-campaign';
import { createCampaignMapUnitPlacements } from '../src/content/campaign-map-unit-placements';
import map from '../src/content/oregon-01.json';
import {
  oregon01CampaignContentVersionFor,
  oregon01CompletedScenarioIdsForContentVersion,
  oregon01LegacyCampaignContentVersionFor,
  parseOregon01ReplayContentVersion,
} from '../src/content/oregon-01-content-version';
import { oregon01CampaignId } from '../src/content/oregon-01-identity';
import {
  completedScenarioIdsForMississippiUnitUnlockSnapshot,
  mississippiUnitUnlockSnapshotFor,
} from '../src/content/mississippi-unit-unlocks';
import { mississippi20CampaignId } from '../src/content/mississippi-20-identity';
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

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createOregon01CampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: pool.requests.map(() => 0) })),
    })),
  };
}

function expectedPrizeTypes(mask: number): number[] {
  return [1, 2, 3, 4,
    ...(mask & 2 ? [5] : []),
    ...(mask & 1 ? [6] : []),
    ...(mask & 4 ? [35] : []),
    ...(mask & 8 ? [36] : []),
  ];
}

function expectedFreshMapUnits(mask: number, activity5Only = false): { type: string; activity: number; cell: { x: number; y: number } }[] {
  const typeById = new Map([
    [1, 'gunslinger'], [2, 'mexican'], [3, 'cannon'], [4, 'indian'], [5, 'sniper'],
    [6, 'grandpa'], [9, 'gambler'], [35, 'pyromaniac'], [36, 'salesman'],
  ]);
  const isUnlocked = (unitTypeId: number) => (
    (unitTypeId >= 1 && unitTypeId <= 4)
    || (unitTypeId === 5 && (mask & 2) !== 0)
    || (unitTypeId === 6 && (mask & 1) !== 0)
    || ((unitTypeId === 9 || unitTypeId === 35) && (mask & 4) !== 0)
    || (unitTypeId === 36 && (mask & 8) !== 0)
  );
  return createCampaignMapUnitPlacements(map.originalTileGrid)
    .filter(({ activity, unitTypeId }) => (
      (activity === 5 && unitTypeId !== 9)
      || (activity5Only ? activity === 5 && unitTypeId === 9 && isUnlocked(unitTypeId) : isUnlocked(unitTypeId))
    ))
    .map(({ activity, unitTypeId, cell }) => ({ type: typeById.get(unitTypeId)!, activity, cell }));
}

test('Eastwood is formal level 21 and unlocks only after Horse Hills', async () => {
  assert.equal(officialCampaignStages.length, 27);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 21), {
    scenarioId: oregon01CampaignId,
    contentVersion: oregon01CampaignContentVersionFor([]),
    title: { en: 'Eastwood Forest · Level 21', zh: '东林地 · 第 21 关' },
    globalLevel: 21,
    requiresCompletedScenarioIds: [mississippi20CampaignId],
  });
  assert.equal(createOregon01CampaignContent().formalSettlementSupported, true);

  const progress = createProgress(createMemoryProfileRepository(), officialCampaignStages);
  assert.equal(campaignLevelState(21, await progress.loadCampaign()), 'locked');
  const horseHillsSessionId = 'horse-hills-completed-for-eastwood';
  await progress.applySettlement({
    settlementId: `${horseHillsSessionId}:${mississippi20CampaignId}:8`,
    sessionId: horseHillsSessionId,
    scenarioId: mississippi20CampaignId,
    mode: 'formal',
    waveNumber: 8,
    outcome: 'victory',
    scoreBase: 2_000,
    displayScore: 2_000,
    highScoreCandidate: 2_000,
  });
  assert.equal(campaignLevelState(20, await progress.loadCampaign()), 'completed');
  assert.equal(campaignLevelState(21, await progress.loadCampaign()), 'available');
});

test('Eastwood content versions restore Gambler, Casino and prize availability for every unlock snapshot', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const completed = completedForMask(mask);
    const contentVersion = oregon01CampaignContentVersionFor(completed);
    assert.equal(getBrowserScenarioContentVersion(oregon01CampaignId, completed), contentVersion);
    assert.deepEqual(
      oregon01CompletedScenarioIdsForContentVersion(contentVersion)?.sort(),
      completed.slice().sort(),
    );

    const content = createOregon01CampaignContent(completed);
    const gamblerUnlocked = (mask & 4) !== 0;
    assert.deepEqual(
      content.units.map(({ type, activity, cell }) => ({ type, activity, cell })),
      expectedFreshMapUnits(mask),
      `M21 TDM markers for unlock mask ${mask}`,
    );
    assert.equal(new Set(content.units.map(({ id }) => id)).size, content.units.length, 'fresh unit IDs are unique');
    assert.equal(content.units.some(({ type }) => type === 'gambler'), gamblerUnlocked);
    assert.equal(content.map.decorations?.some(({ asset }) => asset === 'b_3x2_casino'), gamblerUnlocked);
    assert.deepEqual(content.gambler?.unlockedPrizeUnitTypes ?? [], gamblerUnlocked ? expectedPrizeTypes(mask) : []);

    const replayGame = createBrowserGameForOregon01Replay(contentVersion);
    const session = await replayGame.open({
      scenarioId: oregon01CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 21_000 + mask,
    });
    try {
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.deepEqual(
        session.observe().units.map(({ type, activity, cell }) => ({ type, activity, cell })),
        expectedFreshMapUnits(mask),
        `M21 replay factory marker set for unlock mask ${mask}`,
      );
      assert.equal(session.observe().units.some(({ type }) => type === 'gambler'), gamblerUnlocked);
      assert.deepEqual(
        replayGameScenarioPrizeTypes(completed),
        gamblerUnlocked ? expectedPrizeTypes(mask) : [],
      );
    } finally {
      session.close();
    }
  }

  assert.equal(oregon01CompletedScenarioIdsForContentVersion('unknown-version'), undefined);
  assert.equal(oregon01CompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-oregon-01-formal-v1-grandpa1-sniper1-pyro1-salesman2',
  ), undefined);
  assert.deepEqual(
    completedScenarioIdsForMississippiUnitUnlockSnapshot(mississippiUnitUnlockSnapshotFor(unlockScenarioIds)),
    unlockScenarioIds,
  );
});

test('published Eastwood v1 replay versions retain their original activity-5-only map units', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const completed = completedForMask(mask);
    const contentVersion = oregon01LegacyCampaignContentVersionFor(completed);
    const parsedVersion = parseOregon01ReplayContentVersion(contentVersion);
    assert.equal(parsedVersion?.kind, 'legacy-v1');
    assert.deepEqual(parsedVersion?.completedScenarioIds.sort(), completed.slice().sort());
    assert.deepEqual(oregon01CompletedScenarioIdsForContentVersion(contentVersion)?.sort(), completed.slice().sort());

    const session = await createBrowserGameForOregon01Replay(contentVersion).open({
      scenarioId: oregon01CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 21_100 + mask,
    });
    try {
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(session.observe().units.some(({ activity }) => activity === 4), false);
      assert.deepEqual(
        session.observe().units.map(({ type, activity, cell }) => ({ type, activity, cell })),
        expectedFreshMapUnits(mask, true),
        `M21 legacy replay marker set for unlock mask ${mask}`,
      );
      assert.equal(session.observe().units.some(({ type }) => type === 'gambler'), (mask & 4) !== 0);
    } finally {
      session.close();
    }
  }
});

function replayGameScenarioPrizeTypes(completedScenarioIds: readonly string[]): number[] {
  return [...(createOregon01CampaignContent(completedScenarioIds).gambler?.unlockedPrizeUnitTypes ?? [])];
}

test('Eastwood opens in all Free Play difficulties, records formal victory, and isolates Free Play progress', async () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const content = createOregon01CampaignContent([]);
    const session = await createBrowserGame([]).open({
      scenarioId: oregon01CampaignId,
      contentVersion: content.contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 21_030,
    });
    try {
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.observe().wave?.number, 1);
      assert.equal(session.observe().wave?.totalWaves, 8);
      assert.deepEqual([session.observe().map.width, session.observe().map.height], [32, 24]);
    } finally {
      session.close();
    }
  }

  let sessionNumber = 0;
  const completed = [mississippi20CampaignId];
  const content = emptyRequestContent(completed);
  const game = createGame({
    scenarios: { [oregon01CampaignId]: content },
    sessionIdSource: () => `m21-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({ completedScenarios: completed }), officialCampaignStages);
  const formal = await game.open({
    scenarioId: oregon01CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 21_004,
  });
  for (let frame = 0; frame < 80 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  await progress.applySettlement(victory!);
  assert.ok((await progress.exportProfileData()).completedScenarios.includes(oregon01CampaignId));
  assert.equal(campaignLevelState(21, await progress.loadCampaign()), 'completed');
  formal.close();

  const free = await game.open({
    scenarioId: oregon01CampaignId,
    contentVersion: content.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 21_005,
  });
  for (let frame = 0; frame < 80 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(free.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  free.close();
});
