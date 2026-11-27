import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForNevada02Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createBombingtonCampaignContentFromSnapshot } from '../src/content/bombington-campaign';
import {
  bombingtonCampaignContentVersionFromSnapshot,
  type BombingtonUnlockSnapshot,
} from '../src/content/bombington-content-version';
import { nevada02CampaignId } from '../src/content/nevada-02-identity';
import {
  GameReplayError,
  GAME_REPLAY_FORMAT_VERSION,
  GAME_RULES_VERSION,
  serializeReplay,
  type GameReplayPayload,
} from '../src/game/replay';

function snapshotForMask(mask: number): BombingtonUnlockSnapshot {
  return {
    grandpa: Boolean(mask & 1),
    sniper: Boolean(mask & 2),
    pyromaniac: Boolean(mask & 4),
    salesman: Boolean(mask & 8),
    dynamiteUnlocked: Boolean(mask & 16),
  };
}

function canonicalSnapshots(): BombingtonUnlockSnapshot[] {
  return Array.from({ length: 32 }, (_, mask) => snapshotForMask(mask))
    .filter(({ grandpa, dynamiteUnlocked }) => !grandpa || dynamiteUnlocked);
}

test('Bombington replay factory restores each canonical unlock snapshot rather than the importing profile', async () => {
  const snapshots = canonicalSnapshots();
  const versions = new Set<string>();

  for (const [index, snapshot] of snapshots.entries()) {
    const expected = createBombingtonCampaignContentFromSnapshot(snapshot);
    const version = bombingtonCampaignContentVersionFromSnapshot(snapshot);
    assert.equal(expected.contentVersion, version);
    versions.add(version);
    const importingProfileVersion = getBrowserScenarioContentVersion(nevada02CampaignId, []);
    if (version !== importingProfileVersion) assert.notEqual(importingProfileVersion, version);

    const session = await createBrowserGameForNevada02Replay(version).open({
      scenarioId: nevada02CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 42_200 + index,
    });
    try {
      assert.equal(session.startRecord.contentVersion, version);
      assert.deepEqual(
        session.observe().units.map(({ id, type, activity }) => [id, type, activity]),
        expected.units.map(({ id, type, activity }) => [id, type, activity]),
      );
    } finally {
      session.close();
    }
  }

  assert.equal(snapshots.length, 24);
  assert.equal(versions.size, 24);
});

test('Bombington replay factory rejects missing, unknown, and noncanonical content snapshots', async () => {
  const stateDigest = `sha256:${'0'.repeat(64)}`;
  const canonicalVersion = bombingtonCampaignContentVersionFromSnapshot({
    grandpa: false,
    sniper: false,
    pyromaniac: false,
    salesman: false,
    dynamiteUnlocked: false,
  });
  const makeReplay = (contentVersion?: string) => serializeReplay({
    formatVersion: GAME_REPLAY_FORMAT_VERSION,
    rulesVersion: GAME_RULES_VERSION,
    startRecord: {
      sessionId: 'bombington-invalid-replay',
      scenarioId: nevada02CampaignId,
      ...(contentVersion === undefined ? {} : { contentVersion }),
      rulesVersion: GAME_RULES_VERSION,
      randomAlgorithm: 'java.util.Random',
      randomSeed: 42_299,
      mode: 'free',
      difficulty: 'medium',
    } as GameReplayPayload['startRecord'],
    frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
    checkpoints: [{ frame: 0, stateDigest }, { frame: 1, stateDigest }],
    terminal: {
      frame: 1,
      settlement: { outcome: 'victory', scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
      stateDigest,
    },
  });

  await assert.rejects(
    createBrowserGameForNevada02Replay(undefined).replay(await makeReplay()),
    (error: unknown) => error instanceof GameReplayError && error.code === 'missing-version',
  );

  for (const version of [
    'unknown-bombington-version',
    `${canonicalVersion}-extra`,
    canonicalVersion.replace('grandpa0', 'grandpa1'),
  ]) {
    await assert.rejects(
      createBrowserGameForNevada02Replay(version).replay(await makeReplay(version)),
      (error: unknown) => error instanceof GameReplayError && error.code === 'content-unavailable',
      `Bombington must reject unsupported version ${version}`,
    );
  }
});
