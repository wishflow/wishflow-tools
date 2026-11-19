import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForDakota05Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createDakota05CampaignContentFromSnapshot } from '../src/content/dakota-05-campaign';
import {
  dakota05CampaignContentVersionForSnapshot,
  type Dakota05CampaignUnlockSnapshot,
} from '../src/content/dakota-05-content-version';
import { dakota05CampaignId } from '../src/content/dakota-05-identity';
import {
  GameReplayError,
  GAME_REPLAY_FORMAT_VERSION,
  GAME_RULES_VERSION,
  serializeReplay,
  type GameReplayPayload,
} from '../src/game/replay';

const unitUnlockScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;

function snapshotForMask(mask: number): Dakota05CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
  };
}

function completedIdsForMask(mask: number): string[] {
  return unitUnlockScenarioIds.flatMap((scenarioId, index) => (mask & (1 << index) ? [scenarioId] : []));
}

test('Ghost Town replay factory rebuilds every recorded unlock snapshot instead of using the importing profile', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    const snapshot = snapshotForMask(mask);
    const version = dakota05CampaignContentVersionForSnapshot(snapshot);
    const importingProfileVersion = getBrowserScenarioContentVersion(dakota05CampaignId, completedIdsForMask(15 - mask));
    assert.notEqual(importingProfileVersion, version, 'the importer has a different content snapshot');

    const session = await createBrowserGameForDakota05Replay(version).open({
      scenarioId: dakota05CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 35_400 + mask,
    });
    try {
      const expected = createDakota05CampaignContentFromSnapshot(snapshot);
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

test('Ghost Town replay factory rejects missing and noncanonical content versions', async () => {
  const stateDigest = `sha256:${'0'.repeat(64)}`;
  const makeReplay = (contentVersion?: string) => serializeReplay({
    formatVersion: GAME_REPLAY_FORMAT_VERSION,
    rulesVersion: GAME_RULES_VERSION,
    startRecord: {
      sessionId: 'ghost-town-invalid-replay',
      scenarioId: dakota05CampaignId,
      ...(contentVersion === undefined ? {} : { contentVersion }),
      rulesVersion: GAME_RULES_VERSION,
      randomAlgorithm: 'java.util.Random',
      randomSeed: 35_499,
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
    createBrowserGameForDakota05Replay(undefined).replay(await makeReplay()),
    (error: unknown) => error instanceof GameReplayError && error.code === 'missing-version',
  );

  const invalidVersions = [
    'unknown-version',
    'gng-free-1.8.6-dakota-05-formal-v1-grandpa2-sniper0-pyro0-salesman0',
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
    `${dakota05CampaignContentVersionForSnapshot(snapshotForMask(0))}-extra`,
  ];
  for (const version of invalidVersions) {
    await assert.rejects(
      createBrowserGameForDakota05Replay(version).replay(await makeReplay(version)),
      (error: unknown) => error instanceof GameReplayError && error.code === 'content-unavailable',
      `Ghost Town must reject unsupported version ${version}`,
    );
  }
});
