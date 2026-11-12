import assert from 'node:assert/strict';
import test from 'node:test';
import map from '../src/content/mississippi-13.json';
import { createMississippi13MapUnits } from '../src/content/mississippi-13-units';
import { createMississippi13SteamerUnits } from '../src/content/mississippi-13-steamer';
import {
  mississippi13CampaignContentVersionFor,
  mississippi13CompletedScenarioIdsForContentVersion,
} from '../src/content/mississippi-13-content-version';

const pyromaniacUnlockScenarioId = 'campaign-nevada-10';
const salesmanUnlockScenarioId = 'campaign-alaska-10';

function unitSummary(completedScenarioIds: readonly string[]) {
  return createMississippi13MapUnits(completedScenarioIds).map(({ type, activity, cell, hirePrice, asset }) => ({
    type,
    activity,
    cell,
    ...(hirePrice === undefined ? {} : { hirePrice }),
    asset,
  }));
}

test('creates map16 Indian and gates the Pyromaniac/Salesman with their independent global milestones', () => {
  const indian = { type: 'indian', activity: 5, cell: { x: 10, y: 6 }, asset: 'player_indian' };
  assert.deepEqual(unitSummary([]), [indian]);
  assert.deepEqual(unitSummary([pyromaniacUnlockScenarioId]), [
    indian,
    {
      type: 'pyromaniac', activity: 4, cell: { x: 23, y: 22 },
      hirePrice: 130, asset: 'player_pyromaniac_sleep',
    },
  ]);
  assert.deepEqual(unitSummary([salesmanUnlockScenarioId]), [
    indian,
    {
      type: 'salesman', activity: 4, cell: { x: 12, y: 7 },
      hirePrice: 110, asset: 'player_salesman_sleep',
    },
  ]);
  assert.deepEqual(unitSummary([pyromaniacUnlockScenarioId, salesmanUnlockScenarioId]), [
    indian,
    {
      type: 'salesman', activity: 4, cell: { x: 12, y: 7 },
      hirePrice: 110, asset: 'player_salesman_sleep',
    },
    {
      type: 'pyromaniac', activity: 4, cell: { x: 23, y: 22 },
      hirePrice: 130, asset: 'player_pyromaniac_sleep',
    },
  ]);
  assert.equal(createMississippi13MapUnits([]).find(({ type }) => type === 'indian')?.weapon?.damage, 400);
});

test('does not turn save-only markers 96–101 into fresh map16 hireable units', () => {
  const saveOnlyCount = map.originalTileGrid.flat().filter((code) => code >= 96 && code <= 101).length;
  assert.equal(saveOnlyCount, 21);
  assert.deepEqual(createMississippi13MapUnits([]).map(({ type }) => type), ['indian']);
});

test('M13 replay content version round-trips both independent unlock bits and rejects malformed values', () => {
  const combinations = [
    { completed: [], version: 'gng-free-1.8.6-mississippi-13-formal-v1-pyro0-salesman0' },
    { completed: [pyromaniacUnlockScenarioId], version: 'gng-free-1.8.6-mississippi-13-formal-v1-pyro1-salesman0' },
    { completed: [salesmanUnlockScenarioId], version: 'gng-free-1.8.6-mississippi-13-formal-v1-pyro0-salesman1' },
    {
      completed: [pyromaniacUnlockScenarioId, salesmanUnlockScenarioId],
      version: 'gng-free-1.8.6-mississippi-13-formal-v1-pyro1-salesman1',
    },
  ];
  for (const { completed, version } of combinations) {
    assert.equal(mississippi13CampaignContentVersionFor(completed), version);
    assert.deepEqual(mississippi13CompletedScenarioIdsForContentVersion(version), completed);
  }
  for (const invalid of [
    '',
    combinations[0]!.version.replace('formal-v1', 'formal-v2'),
    combinations[0]!.version.replace('pyro0', 'pyro2'),
    combinations[0]!.version.replace('salesman0', 'salesman2'),
    `${combinations[0]!.version}-extra`,
  ]) assert.equal(mississippi13CompletedScenarioIdsForContentVersion(invalid), undefined);
});

test('creates exactly two independent M13 Steamers with the original active/sleeping cannon markers', () => {
  const units = createMississippi13SteamerUnits();
  assert.equal(units.length, 12);
  assert.equal(new Set(units.map(({ id }) => id)).size, 12);
  const groups = new Map<string, typeof units>();
  for (const unit of units) {
    assert.ok(unit.movementGroupId);
    groups.set(unit.movementGroupId, [...(groups.get(unit.movementGroupId) ?? []), unit]);
  }
  assert.deepEqual([...groups.keys()].sort(), [
    'mississippi-13-steamer-2-11',
    'mississippi-13-steamer-20-12',
  ]);
  const shapeByGroup = Object.fromEntries([...groups.entries()].map(([id, group]) => [
    id,
    group.map(({ type, activity, cell }) => [type, activity, cell.x, cell.y]),
  ]));
  assert.deepEqual(shapeByGroup, {
    'mississippi-13-steamer-2-11': [
      ['steamer-30', 5, 2, 11], ['steamer-31', 5, 3, 11], ['steamer-32', 4, 4, 11],
      ['steamer-32', 5, 5, 11], ['steamer-32', 4, 6, 11], ['steamer-33', 5, 7, 11],
    ],
    'mississippi-13-steamer-20-12': [
      ['steamer-30', 5, 20, 12], ['steamer-31', 5, 21, 12], ['steamer-32', 4, 22, 12],
      ['steamer-32', 4, 23, 12], ['steamer-32', 4, 24, 12], ['steamer-33', 5, 25, 12],
    ],
  });
  assert.deepEqual(
    Object.fromEntries([30, 31, 32, 33].map((typeId) => [
      typeId,
      units.filter(({ type }) => type === `steamer-${typeId}`).length,
    ])),
    { 30: 2, 31: 2, 32: 6, 33: 2 },
  );
  assert.equal(units.filter(({ type, activity }) => type === 'steamer-32' && activity === 4).length, 5);
  assert.equal(units.filter(({ type, activity }) => type === 'steamer-32' && activity === 5).length, 1);
});
