import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import { createGame } from '../src/game';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { createProgress } from '../src/progress';

test('uses the selected difficulty for enemy hit points and separately rounded scores', async () => {
  const scenario = {
    ...cowGulchContent,
    id: 'difficulty-sample',
    contentVersion: 'difficulty-sample-v1',
    campaignWaveCount: undefined,
    campaignWaves: undefined,
    units: [],
    previewWave: {
      ...cowGulchContent.previewWave!,
      initialLives: 1,
      initialCash: 67,
      enemyHitPointMultiplierPercentByDifficulty: { easy: 100, medium: 125, hard: 155 },
    },
  };
  const game = createGame({ scenarios: { [scenario.id]: scenario } });

  const medium = await game.open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'medium',
  });
  medium.submitIntent({ type: 'start-wave' });
  assert.equal(medium.advance({ deltaMs: 0 }).enemies[0]?.maxHitPoints, 157);
  assert.equal(medium.startRecord.difficulty, 'medium');
  medium.close();

  const hard = await game.open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'hard',
  });
  hard.submitIntent({ type: 'start-wave' });
  let settled = hard.advance({ deltaMs: 0 });
  for (let step = 0; step < 2000 && settled.wave?.phase === 'active'; step += 1) {
    settled = hard.advance({ deltaMs: 100 });
  }
  assert.equal(settled.wave?.settlement?.outcome, 'defeat');
  assert.equal(settled.wave?.settlement?.displayScore, 101);
  assert.equal(settled.wave?.settlement?.highScoreCandidate, 100);
  assert.equal(hard.startRecord.difficulty, 'hard');
});

test('replays preserve selected difficulty and its settled result', async () => {
  const scenario = {
    ...cowGulchContent,
    id: 'difficulty-replay-sample',
    contentVersion: 'difficulty-replay-sample-v1',
    campaignWaveCount: undefined,
    campaignWaves: undefined,
    units: [],
    previewWave: {
      ...cowGulchContent.previewWave!,
      initialLives: 1,
      initialCash: 67,
      enemyHitPointMultiplierPercentByDifficulty: { easy: 100, medium: 125, hard: 155 },
    },
  };
  const game = createGame({ scenarios: { [scenario.id]: scenario } });
  const session = await game.open({
    scenarioId: scenario.id,
    mode: 'formal',
    difficulty: 'hard',
  });
  session.submitIntent({ type: 'start-wave' });
  let view = session.advance({ deltaMs: 0 });
  for (let step = 0; step < 2000 && view.wave?.phase === 'active'; step += 1) {
    view = session.advance({ deltaMs: 100 });
  }
  const expected = view.wave?.settlement;
  const replay = await game.replay(await session.exportReplay());

  assert.equal(replay.sourceStartRecord.difficulty, 'hard');
  assert.deepEqual(replay.session.observe().wave?.settlement, expected);
  replay.session.close();
  session.close();
});

test('persists difficulty with settings and derives Hard unlock from completed level ten', async () => {
  const progress = createProgress(createMemoryProfileRepository(), [{
    scenarioId: 'campaign-level-10',
    contentVersion: 'campaign-level-10-v1',
    title: { en: 'Level 10', zh: '第 10 关' },
    globalLevel: 10,
    requiresCompletedScenarioIds: [],
  }]);

  assert.equal((await progress.loadCampaign()).hardModeUnlocked, false);
  await assert.rejects(progress.saveSettings({ simulationSpeed: 2, difficulty: 'hard' }), (error: unknown) =>
    error instanceof Error && 'code' in error && error.code === 'difficulty-locked');
  await progress.saveSettings({ simulationSpeed: 2, difficulty: 'medium' });
  assert.equal((await progress.loadSettings()).difficulty, 'medium');

  await progress.applySettlement({
    settlementId: 'session-ten:campaign-level-10:1',
    sessionId: 'session-ten',
    scenarioId: 'campaign-level-10',
    mode: 'formal',
    waveNumber: 1,
    outcome: 'victory',
    scoreBase: 67,
    displayScore: 67,
    highScoreCandidate: 67,
  });
  assert.equal((await progress.loadCampaign()).hardModeUnlocked, true);
  await progress.saveSettings({ simulationSpeed: 2, difficulty: 'hard' });
  assert.equal((await progress.loadSettings()).difficulty, 'hard');
  await progress.saveSettings({ simulationSpeed: 2, difficulty: 'easy' });
  assert.equal((await progress.loadSettings()).difficulty, 'easy');
  assert.equal((await progress.loadCampaign()).hardModeUnlocked, true);
});
