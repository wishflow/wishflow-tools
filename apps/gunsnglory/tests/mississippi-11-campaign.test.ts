import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMississippi11CampaignContent,
  mississippi11CampaignContentVersionFor,
  mississippi11CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-11-campaign';

const pyromaniacUnlockScenarioId = 'campaign-nevada-10';
const salesmanUnlockScenarioId = 'campaign-alaska-10';

function specialHireUnits(completedScenarioIds: readonly string[]) {
  return createMississippi11CampaignContent(completedScenarioIds).units
    .filter(({ type }) => type === 'pyromaniac' || type === 'salesman');
}

test('Traveller’s Town only exposes TDM special hire units after their original global unlocks', () => {
  assert.deepEqual(specialHireUnits([]), []);

  const pyromaniac = specialHireUnits([pyromaniacUnlockScenarioId]);
  assert.equal(pyromaniac.length, 1);
  assert.deepEqual(
    (({ type, activity, cell, hirePrice, asset }) => ({ type, activity, cell, hirePrice, asset }))(pyromaniac[0]!),
    {
      type: 'pyromaniac',
      activity: 4,
      cell: { x: 25, y: 5 },
      hirePrice: 130,
      asset: 'player_pyromaniac_sleep',
    },
  );

  const salesman = specialHireUnits([salesmanUnlockScenarioId]);
  assert.deepEqual(
    salesman.map(({ type, activity, cell, hirePrice, asset }) => ({ type, activity, cell, hirePrice, asset })),
    [{
      type: 'salesman',
      activity: 4,
      cell: { x: 13, y: 16 },
      hirePrice: 110,
      asset: 'player_salesman_sleep',
    }],
  );

  const both = specialHireUnits([pyromaniacUnlockScenarioId, salesmanUnlockScenarioId]);
  assert.deepEqual(
    both.map(({ type, activity, cell, hirePrice, asset }) => ({ type, activity, cell, hirePrice, asset })),
    [
      {
        type: 'pyromaniac',
        activity: 4,
        cell: { x: 25, y: 5 },
        hirePrice: 130,
        asset: 'player_pyromaniac_sleep',
      },
      {
        type: 'salesman',
        activity: 4,
        cell: { x: 13, y: 16 },
        hirePrice: 110,
        asset: 'player_salesman_sleep',
      },
    ],
  );
});

test('contentVersion round-trips only the unlock milestones that affect replay units', () => {
  assert.equal(
    mississippi11CampaignContentVersionFor([]),
    'gng-free-1.8.6-mississippi-11-formal-v2-grandpa0-sniper0-pyro0-salesman0',
  );
  assert.equal(mississippi11CampaignContentVersionFor([pyromaniacUnlockScenarioId]),
    'gng-free-1.8.6-mississippi-11-formal-v2-grandpa0-sniper0-pyro1-salesman0');
  assert.equal(mississippi11CampaignContentVersionFor([salesmanUnlockScenarioId]),
    'gng-free-1.8.6-mississippi-11-formal-v2-grandpa0-sniper0-pyro0-salesman1');
  assert.equal(mississippi11CampaignContentVersionFor([pyromaniacUnlockScenarioId, salesmanUnlockScenarioId]),
    'gng-free-1.8.6-mississippi-11-formal-v2-grandpa0-sniper0-pyro1-salesman1');
  assert.deepEqual(
    mississippi11CompletedScenarioIdsForContentVersion(
      'gng-free-1.8.6-mississippi-11-formal-v1-pyro1-sales0',
    ),
    [pyromaniacUnlockScenarioId],
  );
  assert.deepEqual(
    mississippi11CompletedScenarioIdsForContentVersion(
      'gng-free-1.8.6-mississippi-11-formal-v1-pyro1-sales1',
    ),
    [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId],
  );
  assert.equal(
    mississippi11CompletedScenarioIdsForContentVersion('gng-free-1.8.6-mississippi-11-formal-v1-pyro2-sales0'),
    undefined,
  );
  assert.equal(
    mississippi11CompletedScenarioIdsForContentVersion('gng-free-1.8.6-mississippi-11-formal-v1-pyro0-sales0-extra'),
    undefined,
  );
  assert.deepEqual(mississippi11CompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-mississippi-11-formal-v2-grandpa1-sniper1-pyro0-salesman0',
  ), ['campaign-oregon-10', 'campaign-dakota-10']);
  assert.equal(mississippi11CompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-mississippi-11-formal-v2-grandpa2-sniper0-pyro0-salesman0',
  ), undefined);

  const replaySnapshot = mississippi11CompletedScenarioIdsForContentVersion(
    'gng-free-1.8.6-mississippi-11-formal-v1-pyro1-sales0',
  )!;
  assert.deepEqual(specialHireUnits(replaySnapshot).map(({ type }) => type), ['pyromaniac']);
  assert.deepEqual(specialHireUnits([]), [], 'the importing profile must not mutate the replay snapshot');
});
