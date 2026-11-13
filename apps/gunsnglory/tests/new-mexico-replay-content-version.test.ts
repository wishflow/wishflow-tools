import assert from 'node:assert/strict';
import test from 'node:test';
import {
  newMexicoCampaignContentVersionFor,
  parseNewMexicoReplayContentVersion,
} from '../src/content/new-mexico-replay-content-version';

const stages = [
  { scenarioId: 'campaign-new-mexico-04', legacyVersion: 'gng-free-1.8.6-new-mexico-04-formal-v1', hasMapAccessBit: true },
  { scenarioId: 'campaign-new-mexico-05', legacyVersion: 'gng-free-1.8.6-new-mexico-05-formal-v1', hasMapAccessBit: false },
  { scenarioId: 'campaign-new-mexico-06', legacyVersion: 'gng-free-1.8.6-new-mexico-06-formal-v1', hasMapAccessBit: false },
  { scenarioId: 'campaign-new-mexico-07', legacyVersion: 'gng-free-1.8.6-new-mexico-07-formal-v1', hasMapAccessBit: false },
] as const;

const milestoneScenarioIds = [
  'campaign-oregon-10',
  'campaign-dakota-10',
  'campaign-nevada-10',
  'campaign-alaska-10',
] as const;

function completedForMask(mask: number, map04Accessible = false): string[] {
  return [
    ...milestoneScenarioIds.filter((_, bit) => (mask & (1 << bit)) !== 0),
    ...(map04Accessible ? ['campaign-new-mexico-03'] : []),
  ];
}

test('M4-M7 snapshot versions round-trip all global unit unlock combinations', () => {
  for (const { scenarioId, hasMapAccessBit } of stages) {
    const accessStates = hasMapAccessBit ? [false, true] : [false];
    for (let mask = 0; mask < 16; mask += 1) {
      for (const map04Accessible of accessStates) {
        const completedScenarioIds = completedForMask(mask, map04Accessible);
        const contentVersion = newMexicoCampaignContentVersionFor(scenarioId, completedScenarioIds);
        const parsed = parseNewMexicoReplayContentVersion(scenarioId, contentVersion);

        assert.deepEqual(parsed, {
          kind: 'snapshot-v2',
          completedScenarioIds: completedScenarioIds.slice().sort(),
          ...(hasMapAccessBit ? { map04Accessible } : {}),
        }, `${scenarioId}, unlock mask ${mask}, map04 access ${map04Accessible}`);
      }
    }
  }
});

test('M4-M7 recognize their fixed v1 replay versions without inventing a snapshot', () => {
  for (const { scenarioId, legacyVersion } of stages) {
    assert.deepEqual(parseNewMexicoReplayContentVersion(scenarioId, legacyVersion), { kind: 'legacy-v1' });
  }
});

test('M4-M7 snapshot parsers reject malformed, cross-stage and unknown versions', () => {
  assert.equal(parseNewMexicoReplayContentVersion('campaign-new-mexico-04', undefined), undefined);
  assert.equal(parseNewMexicoReplayContentVersion('campaign-new-mexico-04', 'unknown'), undefined);
  assert.equal(parseNewMexicoReplayContentVersion(
    'campaign-new-mexico-04',
    'gng-free-1.8.6-new-mexico-04-formal-v2-grandpa1-sniper0-pyro0-salesman0-map-access-2',
  ), undefined);
  assert.equal(parseNewMexicoReplayContentVersion(
    'campaign-new-mexico-04',
    'gng-free-1.8.6-new-mexico-04-formal-v2-grandpa1-sniper0-pyro0-salesman0',
  ), undefined);
  assert.equal(parseNewMexicoReplayContentVersion(
    'campaign-new-mexico-05',
    newMexicoCampaignContentVersionFor('campaign-new-mexico-04', []),
  ), undefined);
});
