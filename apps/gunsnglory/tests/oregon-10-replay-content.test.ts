import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForOregon10Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { oregon10CampaignContentVersionForSnapshot, parseOregon10ReplayContentVersion } from '../src/content/oregon-10-content-version';
import { oregon10CampaignId } from '../src/content/oregon-10-identity';

test('Lumber Mill Hills replay factory restores recorded unlocks instead of importer profile', async () => {
  const snapshot = {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
    dynamiteUnlocked: true,
  };
  const version = oregon10CampaignContentVersionForSnapshot(snapshot);
  const importerCompleted: string[] = [];

  assert.deepEqual(parseOregon10ReplayContentVersion(version)?.snapshot, snapshot);
  assert.notEqual(getBrowserScenarioContentVersion(oregon10CampaignId, importerCompleted), version);

  const session = await createBrowserGameForOregon10Replay(version).open({
    scenarioId: oregon10CampaignId,
    contentVersion: version,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 30_000,
  });
  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, version);
    assert.equal(view.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length, 2);
    assert.equal(view.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length, 0);
    assert.equal(view.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length, 1);
    assert.equal(view.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length, 0);
    assert.ok(view.dynamites?.every(({ unlocked }) => unlocked));
  } finally {
    session.close();
  }
});

test('Lumber Mill Hills replay factory refuses an unrecognized content snapshot', async () => {
  await assert.rejects(
    createBrowserGameForOregon10Replay(undefined).open({
      scenarioId: oregon10CampaignId,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 30_001,
    }),
    (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
  );
});
