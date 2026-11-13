import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi16Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { campaignLevelState } from '../src/content/campaign-catalog';
import { createMississippi16CampaignContent } from '../src/content/mississippi-16-campaign';
import { mississippi16CampaignCopy } from '../src/content/mississippi-16-campaign-copy';
import {
  mississippi16CampaignContentVersionFor,
  mississippi16CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-16-content-version';
import { mississippi16CampaignId } from '../src/content/mississippi-16-identity';
import { mississippi16WaveIntros } from '../src/content/mississippi-16-wave-intros';
import {
  officialCampaignStages,
  mississippi16LevelSixteenCampaignContent,
} from '../src/content/official-campaign';
import { collectScenarioImageAssetNames } from '../src/content/scenario-image-assets';
import { gameAssetRelativePath } from '../src/render/game-asset-path';
import { createGame, type CampaignWaveDefinition, type ScenarioContent } from '../src/game';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';

const appRoot = path.resolve(import.meta.dirname, '..');
const pyroUnlock = 'campaign-nevada-10';
const salesmanUnlock = 'campaign-alaska-10';
const dynamiteUnlock = 'campaign-mississippi-10';
const completedThroughLevelFifteen = [
  ...Array.from({ length: 10 }, (_, index) => `campaign-new-mexico-${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 5 }, (_, index) => `campaign-mississippi-${String(index + 11).padStart(2, '0')}`),
];

test('Highpoint Terrace preserves APK English campaign copy and all eight dialogue resources', () => {
  assert.deepEqual(mississippi16CampaignCopy, {
    title: { en: 'Highpoint Terrace', zh: '高台露台' },
    overview: {
      en: 'The notorious Highpoint Terrace was once a dangerous spot, but soldiers now guard the area from their forts located up high.',
      zh: '恶名昭著的高台露台曾经危机四伏，如今士兵们驻守在高处的堡垒中守卫这里。',
    },
    victoryTitle: { en: 'The Sharpshooter of Highpoint Terrace', zh: '高台露台神枪手' },
  });
  assert.deepEqual(mississippi16WaveIntros.map(({ waveNumber, dialogueResource }) => [waveNumber, dialogueResource]), [
    [1, 'T_CAMPAIGN_16_01'], [2, 'T_CAMPAIGN_16_02'], [3, 'T_CAMPAIGN_16_03'], [4, 'T_CAMPAIGN_16_04'],
    [5, 'T_CAMPAIGN_16_05'], [6, 'T_CAMPAIGN_16_06'], [7, 'T_CAMPAIGN_16_07'], [8, 'T_CAMPAIGN_16_08'],
  ]);
  assert.deepEqual(mississippi16WaveIntros.map(({ text }) => text.en), [
    "We're safe here, honey! The soldiers from the forts would never get mixed up with bandits!",
    "I can't hear the others any more. It must be safe here.",
    'Look! The soldier up there is waving to us with his cannon!',
    'I wonder if the poor soldiers have to climb up here to their fort every day.',
    "Enemy sighted at 12 o'clock!",
    "Enemy at 12 o'clock? Is it that time already? And whaddya mean, enemy? I thought we were the enemy!",
    "It's practically an invasion!",
    'We need more cannons!',
  ]);
  assert.ok(mississippi16WaveIntros.every(({ speaker, text }) => speaker.zh.length > 0 && text.zh.length > 0));
  assert.deepEqual(mississippi16WaveIntros.map(({ portraitAsset, voiceSound }) => [portraitAsset, voiceSound]), [
    ['portrait_settlers', 'sound_siedler'], ['portrait_settlers', 'sound_siedler'],
    ['portrait_settlers', 'sound_siedler'], ['portrait_settlers', 'sound_siedler'],
    ['portrait_deserter', 'sound_deserter_yes_sir'], ['portrait_mexican', 'sound_mexican_arriba'],
    ['portrait_gunslinger', 'sound_desperado_yihaa'], ['portrait_deserter', 'sound_deserter_yes_sir'],
  ]);
});

test('Highpoint Terrace is formal level 16 and requires completion of Railroad Canyon', async () => {
  assert.equal(officialCampaignStages.length, 25);
  assert.deepEqual(officialCampaignStages.find(({ globalLevel }) => globalLevel === 16), {
    scenarioId: mississippi16CampaignId,
    contentVersion: mississippi16CampaignContentVersionFor([]),
    title: { en: 'Highpoint Terrace · Level 16', zh: '高台露台 · 第 16 关' },
    globalLevel: 16,
    requiresCompletedScenarioIds: ['campaign-mississippi-15'],
  });
  assert.equal(mississippi16LevelSixteenCampaignContent.formalSettlementSupported, true);
  assert.equal(mississippi16LevelSixteenCampaignContent.id, mississippi16CampaignId);

  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelFifteen.slice(0, -1),
  }), officialCampaignStages);
  assert.equal(campaignLevelState(16, await progress.loadCampaign()), 'locked');
  await progress.applySettlement({
    settlementId: 'm16-unlock-after-m15:campaign-mississippi-15:9',
    sessionId: 'm16-unlock-after-m15',
    scenarioId: 'campaign-mississippi-15',
    mode: 'formal',
    waveNumber: 9,
    outcome: 'victory',
    scoreBase: 1_000,
    displayScore: 1_000,
    highScoreCandidate: 1_000,
  });
  assert.equal(campaignLevelState(16, await progress.loadCampaign()), 'available');
});

test('registered Highpoint Terrace is playable in Free Play at every difficulty with its APK scene', async () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const completed = [pyroUnlock, salesmanUnlock];
    const contentVersion = getBrowserScenarioContentVersion(mississippi16CampaignId, completed);
    assert.equal(contentVersion, mississippi16CampaignContentVersionFor(completed));
    const session = await createBrowserGame(completed).open({
      scenarioId: mississippi16CampaignId,
      contentVersion,
      mode: 'free',
      difficulty,
      randomSeed: 1_616,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(view.wave?.number, 1);
      assert.equal(view.wave?.totalWaves, 8);
      assert.equal(view.wave?.cash, 365);
      assert.equal(view.wave?.lives, 20);
      assert.equal(view.map.width, 32);
      assert.equal(view.map.height, 24);
      assert.deepEqual(view.units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
        .map(({ type }) => type), ['salesman', 'pyromaniac']);
      assert.equal(view.dynamites?.length, 1);
      assert.ok(view.dynamites?.every(({ unlocked }) => !unlocked));
    } finally {
      session.close();
    }
  }
});

test('Highpoint Terrace content versions and replay factory preserve Pyromaniac, Salesman, and Dynamite snapshots', async () => {
  const snapshots = [
    { completed: [], units: [], dynamite: false },
    { completed: [pyroUnlock], units: ['pyromaniac'], dynamite: false },
    { completed: [salesmanUnlock], units: ['salesman'], dynamite: false },
    { completed: [dynamiteUnlock], units: [], dynamite: true },
    { completed: [pyroUnlock, salesmanUnlock, dynamiteUnlock], units: ['salesman', 'pyromaniac'], dynamite: true },
    { completed: ['campaign-oregon-10'], units: [], dynamite: true },
  ] as const;

  for (const snapshot of snapshots) {
    const contentVersion = mississippi16CampaignContentVersionFor(snapshot.completed);
    assert.equal(getBrowserScenarioContentVersion(mississippi16CampaignId, snapshot.completed), contentVersion);
    const content = createMississippi16CampaignContent(snapshot.completed);
    assert.equal(content.contentVersion, contentVersion);
    assert.equal(content.dynamite?.unlocked, snapshot.dynamite);
    assert.deepEqual(content.units.filter(({ type }) => type === 'pyromaniac' || type === 'salesman')
      .map(({ type }) => type), snapshot.units);

    const reconstructed = mississippi16CompletedScenarioIdsForContentVersion(contentVersion);
    assert.ok(reconstructed);
    const replayContent = createMississippi16CampaignContent(reconstructed);
    assert.equal(replayContent.contentVersion, contentVersion);
    assert.equal(replayContent.dynamite?.unlocked, snapshot.dynamite);
    assert.deepEqual(replayContent.units.map(({ type }) => type), content.units.map(({ type }) => type));

    const session = await createBrowserGameForMississippi16Replay(contentVersion).open({
      scenarioId: mississippi16CampaignId,
      contentVersion,
      mode: 'free',
      difficulty: 'easy',
      randomSeed: 1_619,
    });
    try {
      assert.equal(session.startRecord.contentVersion, contentVersion);
      assert.equal(session.observe().dynamites?.every(({ unlocked }) => unlocked === snapshot.dynamite), true);
    } finally {
      session.close();
    }
  }

  assert.equal(mississippi16CompletedScenarioIdsForContentVersion('unknown-map16-version'), undefined);
});

function emptyRequestContent(completedScenarioIds: readonly string[]): ScenarioContent {
  const content = createMississippi16CampaignContent(completedScenarioIds);
  return {
    ...content,
    campaignUnitPool: undefined,
    campaignWaves: content.campaignWaves!.map((wave): CampaignWaveDefinition => ({
      ...wave,
      delayMs: 0,
      spawnPools: wave.spawnPools.map((pool) => ({ ...pool, requests: Array.from({ length: 10 }, () => 0) })),
    })),
  };
}

test('formal Highpoint Terrace victory completes level 16; Free Play settlement does not write progress', async () => {
  let sessionNumber = 0;
  const content = emptyRequestContent(completedThroughLevelFifteen);
  const game = createGame({
    scenarios: { [mississippi16CampaignId]: content },
    sessionIdSource: () => `m16-settlement-${++sessionNumber}`,
  });
  const progress = createProgress(createMemoryProfileRepository({
    completedScenarios: completedThroughLevelFifteen,
  }), officialCampaignStages);
  const formal = await game.open({
    scenarioId: mississippi16CampaignId,
    contentVersion: content.contentVersion,
    mode: 'formal',
    difficulty: 'medium',
    randomSeed: 1_617,
  });
  for (let frame = 0; frame < 40 && !formal.terminalRecord(); frame += 1) formal.advance({ deltaMs: 0 });
  const victory = formal.terminalRecord();
  assert.equal(victory?.outcome, 'victory');
  assert.equal(victory?.mode, 'formal');
  const saved = await progress.applySettlement(victory!);
  assert.ok(saved.profile.completedScenarios.includes(mississippi16CampaignId));
  assert.equal(campaignLevelState(16, await progress.loadCampaign()), 'completed');
  formal.close();

  const freeContent = emptyRequestContent([]);
  const free = await createGame({ scenarios: { [mississippi16CampaignId]: freeContent } }).open({
    scenarioId: mississippi16CampaignId,
    contentVersion: freeContent.contentVersion,
    mode: 'free',
    difficulty: 'hard',
    randomSeed: 1_618,
  });
  for (let frame = 0; frame < 40 && !free.terminalRecord(); frame += 1) free.advance({ deltaMs: 0 });
  const beforeFreePlayResult = await progress.exportProfileData();
  assert.equal(free.terminalRecord()?.mode, 'free');
  await assert.rejects(progress.applySettlement(free.terminalRecord()!), /only accepts formal/i);
  assert.deepEqual(await progress.exportProfileData(), beforeFreePlayResult);
  free.close();
});

test('Highpoint Terrace scene, portraits, and referenced voice files are bundled for offline play', () => {
  const content = createMississippi16CampaignContent([pyroUnlock, salesmanUnlock]);
  for (const asset of collectScenarioImageAssetNames([content])) {
    assert.equal(existsSync(path.join(appRoot, 'public/assets', gameAssetRelativePath(asset))), true, `${asset} exists`);
  }
  for (const portrait of new Set(mississippi16WaveIntros.map(({ portraitAsset }) => portraitAsset))) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets', `${portrait}.png`));
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  }
  for (const voice of new Set(mississippi16WaveIntros.flatMap(({ voiceSound }) => voiceSound ? [voiceSound] : []))) {
    const bytes = readFileSync(path.join(appRoot, 'public/assets/sounds', `${voice}.ogg`));
    assert.equal(bytes.toString('ascii', 0, 4), 'OggS');
  }
});
