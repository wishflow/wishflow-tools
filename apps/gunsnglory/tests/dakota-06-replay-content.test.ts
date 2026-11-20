import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForDakota06Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { createDakota06CampaignContentFromSnapshot } from '../src/content/dakota-06-campaign';
import {
  dakota06CampaignContentVersionForSnapshot,
  parseDakota06ReplayContentVersion,
  type Dakota06CampaignUnlockSnapshot,
} from '../src/content/dakota-06-content-version';
import { dakota06CampaignId } from '../src/content/dakota-06-identity';
import { completedScenarioIdsForMississippiUnitUnlockSnapshot } from '../src/content/mississippi-unit-unlocks';
import {
  GameReplayError,
  GAME_REPLAY_FORMAT_VERSION,
  GAME_RULES_VERSION,
  serializeReplay,
  type GameReplayPayload,
} from '../src/game/replay';

function snapshotForMask(mask: number, dynamiteUnlocked: boolean): Dakota06CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
    dynamiteUnlocked,
  };
}

function completedIdsForSnapshot(snapshot: Dakota06CampaignUnlockSnapshot): string[] {
  return [
    ...completedScenarioIdsForMississippiUnitUnlockSnapshot(snapshot.unitUnlocks),
    ...(snapshot.dynamiteUnlocked ? ['campaign-mississippi-10'] : []),
  ];
}

test('Ice Rocks replay factory rebuilds all 32 recorded unit and Dynamite snapshots, independent of importer progress', async () => {
  for (let mask = 0; mask < 16; mask += 1) {
    for (const dynamiteUnlocked of [false, true]) {
      const snapshot = snapshotForMask(mask, dynamiteUnlocked);
      const version = dakota06CampaignContentVersionForSnapshot(snapshot);
      assert.deepEqual(parseDakota06ReplayContentVersion(version)?.snapshot, snapshot);

      const importerSnapshot = snapshotForMask(15 - mask, !dynamiteUnlocked);
      const importerVersion = getBrowserScenarioContentVersion(
        dakota06CampaignId,
        completedIdsForSnapshot(importerSnapshot),
      );
      assert.notEqual(importerVersion, version, 'the importer has a different content version');

      const session = await createBrowserGameForDakota06Replay(version).open({
        scenarioId: dakota06CampaignId,
        contentVersion: version,
        mode: 'free',
        difficulty: 'medium',
        randomSeed: 36_400 + mask * 2 + Number(dynamiteUnlocked),
      });
      try {
        const expected = createDakota06CampaignContentFromSnapshot(snapshot);
        assert.equal(session.startRecord.contentVersion, version);
        assert.deepEqual(
          session.observe().units.map(({ id, type, activity }) => [id, type, activity]),
          expected.units.map(({ id, type, activity }) => [id, type, activity]),
        );
        assert.deepEqual(
          session.observe().dynamites?.map(({ unlocked }) => unlocked),
          expected.dynamite?.pairs.map(() => dynamiteUnlocked),
        );
      } finally {
        session.close();
      }
    }
  }
});

test('Ice Rocks replay factory rejects missing and noncanonical content versions', async () => {
  const digest = `sha256:${'0'.repeat(64)}`;
  const makeReplay = (contentVersion?: string) => serializeReplay({
    formatVersion: GAME_REPLAY_FORMAT_VERSION,
    rulesVersion: GAME_RULES_VERSION,
    startRecord: {
      sessionId: 'ice-rocks-invalid-replay',
      scenarioId: dakota06CampaignId,
      ...(contentVersion === undefined ? {} : { contentVersion }),
      rulesVersion: GAME_RULES_VERSION,
      randomAlgorithm: 'java.util.Random',
      randomSeed: 36_499,
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
    createBrowserGameForDakota06Replay(undefined).replay(await makeReplay(undefined)),
    (error: unknown) => error instanceof GameReplayError && error.code === 'missing-version',
  );

  const canonical = dakota06CampaignContentVersionForSnapshot(snapshotForMask(0, false));
  const invalidVersions = [
    'unknown-version',
    'gng-free-1.8.6-dakota-05-formal-v1-grandpa0-sniper0-pyro0-salesman0',
    'gng-free-1.8.6-dakota-06-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
    `${canonical}-extra`,
  ];
  for (const version of invalidVersions) {
    await assert.rejects(
      createBrowserGameForDakota06Replay(version).replay(await makeReplay(version)),
      (error: unknown) => error instanceof GameReplayError && error.code === 'content-unavailable',
      `Ice Rocks must reject unsupported version ${version}`,
    );
  }
});
