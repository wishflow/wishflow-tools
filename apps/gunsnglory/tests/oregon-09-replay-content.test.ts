import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForOregon09Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { oregon09CampaignContentVersionForSnapshot, parseOregon09ReplayContentVersion } from '../src/content/oregon-09-content-version';
import { oregon09CampaignId } from '../src/content/oregon-09-identity';

test('Snake River replay factory restores the recorded unlock snapshot instead of the importer profile', async () => {
  const snapshot = {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
    dynamiteUnlocked: true,
  };
  const version = oregon09CampaignContentVersionForSnapshot(snapshot);
  const importerCompleted: string[] = [];

  assert.deepEqual(parseOregon09ReplayContentVersion(version)?.snapshot, snapshot);
  assert.equal(getBrowserScenarioContentVersion(oregon09CampaignId, importerCompleted),
    oregon09CampaignContentVersionForSnapshot({
      unitUnlocks: { grandpa: false, sniper: false, pyromaniac: false, salesman: false },
      dynamiteUnlocked: false,
    }));
  assert.notEqual(getBrowserScenarioContentVersion(oregon09CampaignId, importerCompleted), version);

  const session = await createBrowserGameForOregon09Replay(version).open({
    scenarioId: oregon09CampaignId,
    contentVersion: version,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 29_800,
  });
  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, version);
    assert.equal(view.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length, 19);
    assert.equal(view.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length, 0);
    assert.equal(view.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length, 1);
    assert.equal(view.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length, 0);
    assert.ok(view.dynamites?.every(({ unlocked }) => unlocked));
  } finally {
    session.close();
  }
});

test('Snake River replay factory refuses an unrecognized content snapshot', async () => {
  await assert.rejects(
    createBrowserGameForOregon09Replay(undefined).open({
      scenarioId: oregon09CampaignId,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 29_801,
    }),
    (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
  );
});
