import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMississippi12CampaignContent,
  mississippi12CampaignContentVersionFor,
  mississippi12CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-12-campaign';
import { mississippi12CampaignId } from '../src/content/mississippi-12-identity';
import { getBrowserScenarioContentVersion, createBrowserGame } from '../src/bootstrap/browser';

const pyromaniacUnlockScenarioId = 'campaign-nevada-10';

function specialUnits(completedScenarioIds: readonly string[]) {
  return createMississippi12CampaignContent(completedScenarioIds).units
    .filter(({ type }) => type === 'pyromaniac');
}

test('Steam Valley only creates marker130 Pyromaniac after the original global level-50 unlock', () => {
  assert.deepEqual(specialUnits([]), []);
  assert.deepEqual(specialUnits([pyromaniacUnlockScenarioId]).map(({ type, activity, cell, hirePrice, asset }) => ({
    type, activity, cell, hirePrice, asset,
  })), [{
    type: 'pyromaniac',
    activity: 4,
    cell: { x: 18, y: 16 },
    hirePrice: 130,
    asset: 'player_pyromaniac_sleep',
  }]);
});

test('Steam Valley contentVersion round-trips only the unlock that changes map15 units', () => {
  const lockedVersion = 'gng-free-1.8.6-mississippi-12-formal-v1-pyro0';
  const unlockedVersion = 'gng-free-1.8.6-mississippi-12-formal-v1-pyro1';
  assert.equal(mississippi12CampaignContentVersionFor([]), lockedVersion);
  assert.equal(mississippi12CampaignContentVersionFor([pyromaniacUnlockScenarioId]), unlockedVersion);
  assert.deepEqual(mississippi12CompletedScenarioIdsForContentVersion(lockedVersion), []);
  assert.deepEqual(mississippi12CompletedScenarioIdsForContentVersion(unlockedVersion), [pyromaniacUnlockScenarioId]);
  for (const invalid of [
    '',
    lockedVersion.replace('formal-v1', 'formal-v2'),
    lockedVersion.replace('pyro0', 'pyro2'),
    `${lockedVersion}-extra`,
  ]) assert.equal(mississippi12CompletedScenarioIdsForContentVersion(invalid), undefined);

  const content = createMississippi12CampaignContent([pyromaniacUnlockScenarioId]);
  assert.equal(content.id, mississippi12CampaignId);
  assert.equal(content.contentVersion, unlockedVersion);
  assert.equal(content.formalSettlementSupported, true);
  assert.deepEqual(content.title, { en: 'Steam Valley', zh: '蒸汽谷' });
  assert.equal(content.map.width, 32);
  assert.equal(content.map.height, 24);
});

test('registered Steam Valley content opens Free Play at all difficulties using the current profile snapshot', async () => {
  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    const version = getBrowserScenarioContentVersion(mississippi12CampaignId, []);
    assert.equal(version, mississippi12CampaignContentVersionFor([]));
    const session = await createBrowserGame([]).open({
      scenarioId: mississippi12CampaignId,
      contentVersion: version,
      mode: 'free',
      difficulty,
      randomSeed: 1201,
    });
    try {
      assert.equal(session.startRecord.mode, 'free');
      assert.equal(session.startRecord.difficulty, difficulty);
      assert.equal(session.startRecord.contentVersion, version);
      assert.equal(session.observe().wave?.totalWaves, 7);
      assert.deepEqual(session.observe().units.filter(({ type }) => type === 'pyromaniac'), []);
    } finally {
      session.close();
    }
  }

  const unlockedVersion = getBrowserScenarioContentVersion(mississippi12CampaignId, [pyromaniacUnlockScenarioId]);
  assert.equal(unlockedVersion, mississippi12CampaignContentVersionFor([pyromaniacUnlockScenarioId]));
  const unlockedSession = await createBrowserGame([pyromaniacUnlockScenarioId]).open({
    scenarioId: mississippi12CampaignId,
    contentVersion: unlockedVersion,
    mode: 'free',
    difficulty: 'easy',
    randomSeed: 1202,
  });
  try {
    assert.deepEqual(unlockedSession.observe().units.filter(({ type }) => type === 'pyromaniac')
      .map(({ type, cell }) => ({ type, cell })), [{ type: 'pyromaniac', cell: { x: 18, y: 16 } }]);
  } finally {
    unlockedSession.close();
  }
});
