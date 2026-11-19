import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForDakota04Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { dakota04CampaignContentVersionForSnapshot } from '../src/content/dakota-04-content-version';
import { dakota04CampaignId } from '../src/content/dakota-04-identity';
import {
  GAME_REPLAY_FORMAT_VERSION,
  GAME_RULES_VERSION,
  serializeReplay,
  type GameReplayPayload,
} from '../src/game/replay';
import type { Dakota04CampaignUnlockSnapshot } from '../src/content/dakota-04-content-version';

const unitUnlockScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;

function snapshotForMask(mask: number): Dakota04CampaignUnlockSnapshot {
  return {
    unitUnlocks: {
      grandpa: Boolean(mask & 1),
      sniper: Boolean(mask & 2),
      pyromaniac: Boolean(mask & 4),
      salesman: Boolean(mask & 8),
    },
    dynamiteUnlocked: Boolean(mask & 16),
  };
}

function profileIdsForSnapshot(snapshot: Dakota04CampaignUnlockSnapshot): string[] {
  return [
    ...(snapshot.unitUnlocks.grandpa ? [unitUnlockScenarioIds[0]] : []),
    ...(snapshot.unitUnlocks.sniper ? [unitUnlockScenarioIds[1]] : []),
    ...(snapshot.unitUnlocks.pyromaniac ? [unitUnlockScenarioIds[2]] : []),
    ...(snapshot.unitUnlocks.salesman ? [unitUnlockScenarioIds[3]] : []),
    ...(snapshot.dynamiteUnlocked ? ['campaign-mississippi-10'] : []),
  ];
}

function expectedHireCounts(snapshot: Dakota04CampaignUnlockSnapshot) {
  return {
    gunslinger: 13,
    mexican: 21,
    cannon: 15,
    indian: 5,
    sniper: Number(snapshot.unitUnlocks.sniper),
    grandpa: snapshot.unitUnlocks.grandpa ? 5 : 0,
    pyromaniac: Number(snapshot.unitUnlocks.pyromaniac),
    salesman: Number(snapshot.unitUnlocks.salesman),
  };
}

function hireCounts(content: { units: readonly { type: string; activity?: number }[] }) {
  return {
    gunslinger: content.units.filter(({ type, activity }) => type === 'gunslinger' && activity === 4).length,
    mexican: content.units.filter(({ type, activity }) => type === 'mexican' && activity === 4).length,
    cannon: content.units.filter(({ type, activity }) => type === 'cannon' && activity === 4).length,
    indian: content.units.filter(({ type, activity }) => type === 'indian' && activity === 4).length,
    sniper: content.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length,
    grandpa: content.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length,
    pyromaniac: content.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length,
    salesman: content.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length,
  };
}

async function replayFixture(contentVersion?: string): Promise<string> {
  const digest = `sha256:${'0'.repeat(64)}`;
  const startRecord = {
    sessionId: 'badlands-replay-fixture',
    scenarioId: dakota04CampaignId,
    ...(contentVersion === undefined ? {} : { contentVersion }),
    rulesVersion: GAME_RULES_VERSION,
    randomAlgorithm: 'java.util.Random' as const,
    randomSeed: 34_499,
    mode: 'free' as const,
  };
  return serializeReplay({
    formatVersion: GAME_REPLAY_FORMAT_VERSION,
    rulesVersion: GAME_RULES_VERSION,
    startRecord: startRecord as GameReplayPayload['startRecord'],
    frames: [{ frame: 1, deltaMs: 0, tileSizePixels: 32, intents: [] }],
    checkpoints: [{ frame: 0, stateDigest: digest }, { frame: 1, stateDigest: digest }],
    terminal: {
      frame: 1,
      settlement: { outcome: 'victory', scoreBase: 0, displayScore: 0, highScoreCandidate: 0 },
      stateDigest: digest,
    },
  });
}

test('Badlands replay factory restores all 32 recorded snapshots instead of the importing profile', async () => {
  for (let mask = 0; mask < 32; mask += 1) {
    const recordedSnapshot = snapshotForMask(mask);
    const recordedVersion = dakota04CampaignContentVersionForSnapshot(recordedSnapshot);
    const importingProfile = profileIdsForSnapshot(snapshotForMask(31 - mask));
    const importingVersion = getBrowserScenarioContentVersion(dakota04CampaignId, importingProfile);

    assert.notEqual(importingVersion, recordedVersion, 'the importer has a different content snapshot');
    const session = await createBrowserGameForDakota04Replay(recordedVersion).open({
      scenarioId: dakota04CampaignId,
      contentVersion: recordedVersion,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 34_400 + mask,
    });
    try {
      const view = session.observe();
      assert.equal(session.startRecord.contentVersion, recordedVersion);
      assert.deepEqual(hireCounts(view), expectedHireCounts(recordedSnapshot));
      assert.equal(view.dynamites?.length, 1);
      assert.ok(view.dynamites?.every(({ unlocked }) => unlocked === recordedSnapshot.dynamiteUnlocked));
      assert.equal(view.units.filter(({ movementGroupId }) => movementGroupId?.startsWith('dakota-04-train-')).length, 4);
    } finally {
      session.close();
    }
  }
});

test('Badlands replay rejects missing, unknown, malformed, and cross-level content versions', async () => {
  await assert.rejects(
    createBrowserGameForDakota04Replay(undefined).replay(await replayFixture()),
    (error: unknown) => (error as { code?: string }).code === 'missing-version',
  );

  const invalidVersions = [
    'unknown-version',
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa2-sniper0-pyro0-salesman0-dynamite0',
    'gng-free-1.8.6-dakota-03-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0',
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite2',
    'gng-free-1.8.6-dakota-04-formal-v1-grandpa0-sniper0-pyro0-salesman0-dynamite0-extra',
  ];
  for (const contentVersion of invalidVersions) {
    await assert.rejects(
      createBrowserGameForDakota04Replay(contentVersion).replay(await replayFixture(contentVersion)),
      (error: unknown) => (error as { code?: string }).code === 'content-unavailable',
      `Badlands must not fall back for ${contentVersion}`,
    );
  }
});
