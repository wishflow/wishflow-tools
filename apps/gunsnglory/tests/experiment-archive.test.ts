import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalSha256Digest } from '../src/value-digest';
import {
  ExperimentArchiveError,
  parseExperimentArchive,
  serializeExperimentArchive,
} from '../src/experiments/experiment-archive';
import type { NumericSchemeVersion } from '../src/experiments';

async function scheme(): Promise<NumericSchemeVersion> {
  const prepared = {
    scenarioId: 'cow-gulch',
    contentVersion: 'cow-gulch-v1',
    rulesVersion: 'gng-rules-4',
    parameters: [{ path: 'previewWave/enemy/cashReward', value: 5 }],
  };
  return {
    id: 'cow-gulch-draft',
    version: 'test-1',
    scenarioId: prepared.scenarioId,
    contentVersion: prepared.contentVersion,
    rulesVersion: prepared.rulesVersion,
    preparedSetup: { ...prepared, digest: await canonicalSha256Digest(prepared) },
  };
}

test('experiment archive round-trips standalone schemes with the versioned file envelope', async () => {
  const data = { schemes: [await scheme()], comparisons: [] };
  const source = serializeExperimentArchive(data);
  assert.deepEqual(parseExperimentArchive(source), data);
  assert.match(source, /"format": "gunsnglory-experiments"/);
  assert.match(source, /"formatVersion": 1/);
});

test('experiment archive parser rejects bad JSON, unknown versions, and invalid or ambiguous records', async () => {
  assert.throws(() => parseExperimentArchive('{'), (error: unknown) =>
    error instanceof ExperimentArchiveError && error.code === 'invalid-json');
  assert.throws(() => parseExperimentArchive(JSON.stringify({
    format: 'gunsnglory-experiments', formatVersion: 8, schemes: [], comparisons: [],
  })), (error: unknown) => error instanceof ExperimentArchiveError && error.code === 'unsupported-version');
  const validScheme = await scheme();
  assert.throws(() => parseExperimentArchive(JSON.stringify({
    format: 'gunsnglory-experiments',
    formatVersion: 1,
    schemes: [validScheme, validScheme],
    comparisons: [],
  })), (error: unknown) => error instanceof ExperimentArchiveError && error.code === 'invalid-data');
  assert.throws(() => parseExperimentArchive(JSON.stringify({
    format: 'gunsnglory-experiments', formatVersion: 1, schemes: [], comparisons: [], revision: 2,
  })), (error: unknown) => error instanceof ExperimentArchiveError && error.code === 'invalid-data');
});
