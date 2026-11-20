import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForDakota07Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createDakota07CampaignContentFromSnapshot } from '../src/content/dakota-07-campaign';
import {
  dakota07CampaignContentVersionForSnapshot,
  parseDakota07ReplayContentVersion,
  type Dakota07CampaignUnlockSnapshot,
} from '../src/content/dakota-07-content-version';
import { dakota07CampaignId } from '../src/content/dakota-07-identity';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import {
  GameReplayError,
  GAME_REPLAY_FORMAT_VERSION,
  GAME_RULES_VERSION,
  serializeReplay,
  type GameReplayPayload,
} from '../src/game/replay';

function snapshotForMask(mask: number): Dakota07CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
  };
}

function completedIdsForSnapshot(snapshot: Dakota07CampaignUnlockSnapshot): string[] {
  return completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot.unitUnlocks);
}

test('Frost Station replay factory rebuilds all 16 recorded unit unlock snapshots, independent of importer progress', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const version = dakota07CampaignContentVersionForSnapshot(snapshot);
    assert.deepEqual(parseDakota07ReplayContentVersion(version)?.snapshot, snapshot);

    const importerSnapshot = snapshotForMask(15 - mask);
    const importerVersion = getBrowserScenarioContentVersion(
      dakota07CampaignId,
      completedIdsForSnapshot(importerSnapshot),
    );
    assert.notEqual(importerVersion, version, 'the importer has a different content version');

    const session = await createBrowserGameForDakota07Replay(version).open({
      scenarioId: dakota07CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 37_400 + mask,
    });
    try {
      const expected = createDakota07CampaignContentFromSnapshot(snapshot);
      assert.equal(session.startRecord.contentVersion, version);
      assert.deepEqual(
        session.observe().units.map(({ id, type, activity }) => [id, type, activity]),
        expected.units.map(({ id, type, activity }) => [id, type, activity]),
      );
    } finally {
      session.close();
    }
  }
});

test('Frost Station replay factory rejects missing and noncanonical content versions', async () => {
  const digest = `sha256:${'0'.repeat(64)}`;
  const makeReplay = (contentVersion?: string) => serializeReplay({
    formatVersion: GAME_REPLAY_FORMAT_VERSION,
    rulesVersion: GAME_RULES_VERSION,
    startRecord: {
      sessionId: 'frost-station-invalid-replay',
      scenarioId: dakota07CampaignId,
      ...(contentVersion === undefined ? {} : { contentVersion }),
      rulesVersion: GAME_RULES_VERSION,
      randomAlgorithm: 'java.util.Random',
      randomSeed: 37_499,
      mode: 'free',
      difficulty: 'medium',
    } as GameReplayPayload['startRecord'],
    frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
    checkpoints: [{ frame: 0, stateDigest: digest }, { frame: 1, stateDigest: digest }],
    terminal: {
      frame: 1,
      settlement: { outcome: 'victory', scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
      stateDigest: digest,
    },
  });

  await assert.rejects(
    createBrowserGameForDakota07Replay(undefined).replay(await makeReplay(undefined)),
    (error: unknown) => error instanceof GameReplayError && error.code === 'missing-version',
  );

  const canonical = dakota07CampaignContentVersionForSnapshot(snapshotForMask(0));
  const invalidVersions = [
    'unknown-version',
    'gng-free-1.8.6-dakota-06-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
    'gng-free-1.8.6-dakota-07-formal-v1-grandpa2-sniper0-pyro0-salesman0',
    `${canonical}-extra`,
  ];
  for (const version of invalidVersions) {
    await assert.rejects(
      createBrowserGameForDakota07Replay(version).replay(await makeReplay(version)),
      (error: unknown) => error instanceof GameReplayError && error.code === 'content-unavailable',
      `Frost Station must reject unsupported version ${version}`,
    );
  }
});
