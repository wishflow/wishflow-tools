import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectOfficialWagonRouteCoverage } from './helpers/official-wagon-route-coverage';

test('official covered-wagon and stagecoach requests map to all formal routes', () => {
  const coverage = inspectOfficialWagonRouteCoverage();

  assert.equal(coverage.officialStageCount, 41);
  assert.deepEqual(coverage.missingScenarioIds, []);
  assert.equal(coverage.requestPoolRowCount, 750);
  assert.equal(coverage.uniqueRequestCaseCount, 294);
  assert.equal(coverage.missingRouteCaseCount, 0);
  assert.equal(coverage.branchCases.length, 182);
  assert.deepEqual(coverage.regionCounts, {
    'new-mexico': { uniqueRequestCaseCount: 50, branchCaseCount: 24 },
    mississippi: { uniqueRequestCaseCount: 84, branchCaseCount: 68 },
    oregon: { uniqueRequestCaseCount: 86, branchCaseCount: 48 },
    'dakota-nevada': { uniqueRequestCaseCount: 74, branchCaseCount: 42 },
  });
});
