import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForLostCityReplay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignCatalog, campaignLevelState } from '../src/content/campaign-catalog';
import {
  createLostCityCampaignContent,
  lostCityCampaignContentVersionFor,
  lostCityCampaignId,
  lostCityCompletedScenarioIdsForContentVersion,
} from '../src/content/lost-city-campaign';
import { lostCityWaveIntros } from '../src/content/lost-city-wave-intros';
import { lostCityCampaignCopy } from '../src/content/lost-city-campaign-copy';
import { officialCampaignStages, lostCityLevelTenCampaignContent } from '../src/content/official-campaign';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const appRoot = path.resolve(import.meta.dirname, '..');
const completedThroughMapNine = Array.from({ length: 9 }, (_, index) => (
  `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`
));

const expectedDialogue = [
  ['Pedro', 'portrait_pedro', 'sound_pedro', "The gulch to the lost city branches out in all directions. We can't lose the settlers there!"],
  ['Gunslinger', 'portrait_gunslinger', 'sound_desperado_yihaa', 'Yeehah! Give me a target!'],
  ['Pedro', 'portrait_pedro', 'sound_pedro', "The lost city is the destination of all the settlers. If we can take control of the city, we'll have the settlers totally in our hands!"],
  ['Settlers', 'portrait_settlers', 'sound_siedler', 'Frank, have you got the compass handy? I thought the lost city was more to the west...'],
  ['Mexican', 'portrait_mexican', 'sound_mexican_arriba', "We have to spread out, or we'll lose them!"],
  ['Indian', 'portrait_indian', 'sound_indian_hugh', 'The lost city is the homeland of our ancestors. No settler must ever enter here!'],
  ['Settlers', 'portrait_settlers', 'sound_siedler', "There's an arrow in your hat. How did that get there? Is that a souvenir?"],
  ['Indian', 'portrait_indian', 'sound_indian_hugh', 'Palefaces are welcome to more souvenirs. They just have to keep still for a moment.'],
  ['Mexican', 'portrait_mexican', 'sound_mexican_arriba', "They're arriving again with lots of wagons full of gold!"],
  ['Pedro', 'portrait_pedro', 'sound_pedro', 'Victory will soon be ours! Then the lost city will belong only to us!'],
] as const;

test('Lost City preserves the APK overview, victory title, dialogue order, portraits and voice routes', () => {
  assert.equal(lostCityCampaignCopy.overview.en, 'Winding valleys lead to a forgotten city, steeped in legend.');
  assert.equal(lostCityCampaignCopy.victoryTitle.en, 'The Bandit Boss of Lost City');
  assert.ok(lostCityCampaignCopy.overview.zh.length > 0);
  assert.ok(lostCityCampaignCopy.victoryTitle.zh.length > 0);
  assert.deepEqual(lostCityWaveIntros.map(({ waveNumber, dialogueResource, speaker, portraitAsset, voiceSound, text }) => [
    waveNumber,
    dialogueResource,
    speaker.en,
    portraitAsset,
    voiceSound,
    text.en,
  ]), expectedDialogue.map(([speaker, portrait, voice, text], index) => [
    index + 1,
    `T_CAMPAIGN_10_${String(index + 1).padStart(2, '0')}`,
    speaker,
    portrait,
    voice,
    text,
  ]));
  assert.ok(lostCityWaveIntros.every(({ speaker, text }) => speaker.zh && text.zh.trim().length > 0));

  for (const portraitName of ['portrait_gunslinger.png', 'portrait_mexican.png']) {
    const image = readFileSync(path.join(appRoot, 'public/assets', portraitName));
    assert.equal(image.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.deepEqual([image.readUInt32BE(16), image.readUInt32BE(20)], [96, 96]);
  }
  for (const voiceName of ['sound_pedro', 'sound_desperado_yihaa', 'sound_siedler', 'sound_mexican_arriba', 'sound_indian_hugh']) {
    const audioPath = path.join(appRoot, 'public/assets/sounds', `${voiceName}.ogg`);
    assert.equal(existsSync(audioPath), true, `${voiceName} is bundled`);
    assert.equal(readFileSync(audioPath).subarray(0, 4).toString('ascii'), 'OggS');
  }
});

test('Lost City level 10 is formally gated by level 9 and is available in Free Play at all difficulties', async () => {
  assert.equal(campaignCatalog[9]?.level, 10);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 10), {
    scenarioId: lostCityCampaignId,
    contentVersion: lostCityCampaignContentVersionFor([]),
    title: { en: 'Lost City · Level 10', zh: '失落之城 · 第 10 关' },
    globalLevel: 10,
    requiresCompletedScenarioIds: ['campaign-new-mexico-09'],
  });
  assert.equal(officialCampaignStages.length, 10);
  assert.equal(lostCityLevelTenCampaignContent.formalSettlementSupported, true);
  assert.equal(getBrowserScenarioContentVersion(lostCityCampaignId), lostCityCampaignContentVersionFor([]));

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapNine.slice(0, 8),
  }), officialCampaignStages);
  assert.equal(campaignLevelState(10, await progress.loadCampaign()), 'locked');
  await progress.applySettlement({
    settlementId: 'map09-unlock:campaign-new-mexico-09:7',
    sessionId: 'map09-unlock',
    scenarioId: 'campaign-new-mexico-09',
    mode: 'formal',
    waveNumber: 7,
    outcome: 'victory',
    scoreBase: 800,
    displayScore: 800,
    highScoreCandidate: 800,
  });
  assert.equal(campaignLevelState(10, await progress.loadCampaign()), 'available');

  for (const { mode, difficulty, completedScenarioIds } of [
    { mode: 'formal', difficulty: 'easy', completedScenarioIds: completedThroughMapNine },
    { mode: 'free', difficulty: 'easy', completedScenarioIds: [] },
    { mode: 'free', difficulty: 'medium', completedScenarioIds: [] },
    { mode: 'free', difficulty: 'hard', completedScenarioIds: [] },
  ] as const) {
    const contentVersion = getBrowserScenarioContentVersion(lostCityCampaignId, completedScenarioIds);
    const session = await createBrowserGame(completedScenarioIds).open({
      scenarioId: lostCityCampaignId,
      contentVersion,
      mode,
      difficulty,
      randomSeed: 110,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, mode);
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 10);
      assert.equal(view.wave?.lives, 25);
      assert.equal(view.wave?.cash, 350);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.equal(session.terminalRecord(), undefined);
    } finally {
      session.close();
    }
  }
});

test('Lost City map-unit unlock snapshots survive content-version replay reconstruction', async () => {
  const snapshots = [
    { completed: [], unlocked: [] },
    { completed: ['campaign-oregon-10'], unlocked: ['grandpa'] },
    { completed: ['campaign-dakota-10'], unlocked: ['sniper'] },
    { completed: ['campaign-nevada-10'], unlocked: ['pyromaniac'] },
    { completed: ['campaign-alaska-10'], unlocked: ['salesman'] },
    { completed: ['campaign-oregon-10', 'campaign-dakota-10', 'campaign-nevada-10', 'campaign-alaska-10'], unlocked: ['grandpa', 'sniper', 'pyromaniac', 'salesman'] },
  ] as const;

  for (const snapshot of snapshots) {
    const content = createLostCityCampaignContent(snapshot.completed);
    const version = lostCityCampaignContentVersionFor(snapshot.completed);
    assert.equal(content.contentVersion, version);
    const actualUnits = new Set(content.units.map(({ type }) => type));
    const expectedUnlocked = new Set<string>(snapshot.unlocked);
    for (const type of ['grandpa', 'sniper', 'pyromaniac', 'salesman']) {
      assert.equal(actualUnits.has(type), expectedUnlocked.has(type), `${type} follows its level milestone`);
    }

    const reconstructed = lostCityCompletedScenarioIdsForContentVersion(version);
    assert.ok(reconstructed);
    const replayContent = createLostCityCampaignContent(reconstructed);
    assert.equal(replayContent.contentVersion, version);
    assert.deepEqual(replayContent.units.map(({ type }) => type), content.units.map(({ type }) => type));

    const replayGame = createBrowserGameForLostCityReplay(version);
    const session = await replayGame.open({
      scenarioId: lostCityCampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 110,
    });
    try {
      assert.equal(session.startRecord.contentVersion, version);
      assert.deepEqual(session.observe().units.map(({ type }) => type), content.units.map(({ type }) => type));
    } finally {
      session.close();
    }
  }
  assert.equal(lostCityCompletedScenarioIdsForContentVersion('unknown-map10-version'), undefined);
});

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const source = createLostCityCampaignContent(completedScenarioIds);
  return {
    ...source,
    campaignWaves: source.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: Array.from({ length: 10 }, () => 0) })),
    })),
  };
}

test('formal Lost City victory records level 10 once; Free Play and replay do not change profile progress', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent(completedThroughMapNine);
  const game = createGame({
    scenarios: { [lostCityCampaignId]: content },
    sessionIdSource: () => `map10-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughMapNine,
  }), officialCampaignStages);

  const formal = await game.open({
    scenarioId: lostCityCampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'easy',
    randomSeed: 110,
  });
  for (let index = 0; index < 12 && !formal.terminalRecord(); index += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(lostCityCampaignId));
  assert.equal(saved.profile.highScores[lostCityCampaignId], victory?.highScoreCandidate);
  assert.deepEqual((await progress.applySettlement(victory!)).profile, saved.profile);

  const serialized = await formal.exportReplay();
  const replay = await game.replay(serialized);
  assert.equal(replay.sourceStartRecord.contentVersion, content.contentVersion);
  assert.deepEqual(replay.session.observe().wave?.settlement, formal.observe().wave?.settlement);
  formal.close();

  const freeContent = emptyRequestContent([]);
  const freeGame = createGame({ scenarios: { [lostCityCampaignId]: freeContent } });
  const free = await freeGame.open({
    scenarioId: lostCityCampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 111,
  });
  for (let index = 0; index < 12 && !free.terminalRecord(); index += 1) free.advance({ deltaMs: 0 });
  const freeResult = free.terminalRecord();
  assert.equal(freeResult?.mode, 'free');
  await assert.rejects(progress.applySettlement(freeResult!), /only accepts formal/i);
  assert.deepEqual((await progress.loadProfile()).completedScenarios, saved.profile.completedScenarios);
  free.close();
});
