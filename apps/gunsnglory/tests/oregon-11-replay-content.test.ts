import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBrowserGameForOregon11Replay,
  getBrowserScenarioContentVersion,
} from '../src/bootstrap/browser';
import { oregon11CampaignContentVersionForSnapshot, parseOregon11ReplayContentVersion } from '../src/content/oregon-11-content-version';
import { oregon11CampaignId } from '../src/content/oregon-11-identity';

test('Loot Lakes replay restores the recorded unlock snapshot, not the importer profile', async () => {
  const snapshot = {
    unitUnlocks: { grandpa: true, sniper: false, pyromaniac: true, salesman: false },
    dynamiteUnlocked: true,
  };
  const version = oregon11CampaignContentVersionForSnapshot(snapshot);
  const importerCompleted: string[] = [];

  assert.deepEqual(parseOregon11ReplayContentVersion(version)?.snapshot, snapshot);
  assert.notEqual(getBrowserScenarioContentVersion(oregon11CampaignId, importerCompleted), version);

  const session = await createBrowserGameForOregon11Replay(version).open({
    scenarioId: oregon11CampaignId,
    contentVersion: version,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 31_000,
  });
  try {
    const view = session.observe();
    assert.equal(session.startRecord.contentVersion, version);
    assert.equal(view.units.filter(({ type, activity }) => type === 'grandpa' && activity === 4).length, 3);
    assert.equal(view.units.filter(({ type, activity }) => type === 'sniper' && activity === 4).length, 1);
    assert.equal(view.units.filter(({ type, activity }) => type === 'pyromaniac' && activity === 4).length, 1);
    assert.equal(view.units.filter(({ type, activity }) => type === 'salesman' && activity === 4).length, 0);
    assert.ok(view.dynamites?.every(({ unlocked }) => unlocked));
  } finally {
    session.close();
  }
});

test('Loot Lakes replay factory refuses an unrecognized content snapshot', async () => {
  await assert.rejects(
    createBrowserGameForOregon11Replay(undefined).open({
      scenarioId: oregon11CampaignId,
      mode: 'free',
      difficulty: 'medium',
      randomSeed: 31_001,
    }),
    (error: unknown) => error instanceof Error && error.message.includes('Unknown scenario'),
  );
});
