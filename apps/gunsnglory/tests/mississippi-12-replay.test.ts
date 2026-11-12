import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGame,
  createBrowserGameForMississippi12Replay,
} from '../src/bootstrap/browser';
import { mississippi12CampaignContentVersionFor } from '../src/content/mississippi-12-campaign';
import { mississippi12CampaignId } from '../src/content/mississippi-12-identity';
import { createProgress } from '../src/progress';
import { createMemoryProfileRepository } from '../src/progress/memory-profile-repository';
import { officialCampaignStages } from '../src/content/official-campaign';

test('Steam Valley replay restores its recorded Pyromaniac snapshot and does not write progress', async () => {
  const snapshots = [
    { recorded: [], currentProfile: ['campaign-nevada-10'], expectsPyromaniac: false },
    { recorded: ['campaign-nevada-10'], currentProfile: [], expectsPyromaniac: true },
  ] as const;

  for (const snapshot of snapshots) {
    const contentVersion = mississippi12CampaignContentVersionFor(snapshot.recorded);
    const sourceGame = createBrowserGame(snapshot.recorded);
    const source = await sourceGame.open({
      scenarioId: mississippi12CampaignId,
      contentVersion,
      mode: 'formal',
      difficulty: 'hard',
      randomSeed: 1_212,
    });
    try {
      const initiallyUnlocked = source.observe().units.some(({ type }) => type === 'pyromaniac');
      assert.equal(initiallyUnlocked, snapshot.expectsPyromaniac);

      let frame = 0;
      while (frame < 5_000 && !source.terminalRecord()) {
        source.advance({ deltaMs: 100 });
        frame += 1;
      }
      const sourceResult = source.terminalRecord();
      assert.ok(sourceResult, 'fixed-seed map15 simulation reaches a deterministic terminal state');
      const serialized = await source.exportReplay();
      const replay = await createBrowserGameForMississippi12Replay(contentVersion).replay(serialized);
      try {
        assert.equal(replay.sourceStartRecord.contentVersion, contentVersion);
        assert.equal(replay.session.startRecord.mode, 'replay');
        assert.equal(replay.session.terminalRecord()?.outcome, sourceResult.outcome);
        assert.deepEqual(
          replay.session.observe().wave?.settlement,
          source.observe().wave?.settlement,
        );
        assert.deepEqual(
          replay.session.observe().units.map(({ id, type, cell }) => ({ id, type, cell })),
          source.observe().units.map(({ id, type, cell }) => ({ id, type, cell })),
        );
        assert.equal(
          replay.session.observe().units.some(({ type }) => type === 'pyromaniac'),
          snapshot.expectsPyromaniac,
          'replay unit visibility follows the recorded version even when the current profile differs',
        );

        const progress = createProgress(createMemoryProfileRepository({
          settings: { simulationSpeed: 1, difficulty: 'easy', soundEnabled: false },
          completedScenarios: [...snapshot.currentProfile],
          highScores: { 'campaign-mississippi-11': 900 },
          appliedSettlementIds: ['existing-formal-result'],
        }), officialCampaignStages);
        const before = await progress.exportProfileData();
        await assert.rejects(progress.applySettlement(replay.session.terminalRecord()!), /only accepts formal/i);
        assert.deepEqual(await progress.exportProfileData(), before);
      } finally {
        replay.session.close();
      }
    } finally {
      source.close();
    }
  }
});
