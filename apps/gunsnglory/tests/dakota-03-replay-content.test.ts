import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForDakota03Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { dakota03CampaignContentVersionForSnapshot } from '../src/content/dakota-03-content-version';
import { dakota03CampaignId } from '../src/content/dakota-03-identity';
import { GameReplayError, GAME_REPLAY_FORMAT_VERSION, GAME_RULES_VERSION, serializeReplay } from '../src/game/replay';

test('Fort Knockout replay factory restores recorded hire markers instead of the importing profile', async () => {
  const snapshot = {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
  };
  const version = dakota03CampaignContentVersionForSnapshot(snapshot);

  assert.notEqual(getBrowserScenarioContentVersion(dakota03CampaignId, []), version);
  const session = await createBrowserGameForDakota03Replay(version).open({
    scenarioId: dakota03CampaignId,
    contentVersion: version,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 33_020,
  });
  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, version);
    assert.equal(view.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length, 11);
    assert.equal(view.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length, 0);
    assert.equal(view.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length, 1);
    assert.equal(view.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length, 0);
  } finally {
    session.close();
  }
});

test('Fort Knockout replay rejects missing versions and marks unsupported snapshots unavailable', async () => {
  const stateDigest = `sha256:${'0'.repeat(64)}`;
  const cases = [
    { contentVersion: undefined, expectedCode: 'missing-version' },
    { contentVersion: 'future-fort-knockout-version', expectedCode: 'content-unavailable' },
    { contentVersion: `${dakota03CampaignContentVersionForSnapshot({
      unitUnlocks: { grandpa: false, sniper: false, pyromaniac: false, salesman: false },
    })}-extra`, expectedCode: 'content-unavailable' },
  ] as const;
  for (const { contentVersion, expectedCode } of cases) {
    const serialized = await serializeReplay({
      formatVersion: GAME_REPLAY_FORMAT_VERSION,
      rulesVersion: GAME_RULES_VERSION,
      startRecord: {
        sessionId: 'fort-knockout-unsupported-replay',
        scenarioId: dakota03CampaignId,
        contentVersion: contentVersion ?? 'unversioned',
        rulesVersion: GAME_RULES_VERSION,
        randomAlgorithm: 'java.util.Random',
        randomSeed: 33_021,
        mode: 'free',
        difficulty: 'easy',
      },
      frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
      checkpoints: [
        { frame: 0, stateDigest },
        { frame: 1, stateDigest },
      ],
      terminal: {
        frame: 1,
        settlement: { outcome: 'victory', scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
        stateDigest,
      },
    });

    await assert.rejects(
      createBrowserGameForDakota03Replay(contentVersion).replay(serialized),
      (error: unknown) => error instanceof GameReplayError && error.code === expectedCode,
      `content version ${String(contentVersion)} must not fall back to the active profile`,
    );
  }
});
