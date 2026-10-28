import assert from 'node:assert/strict';
import test from 'node:test';
import { cowGulchContent } from '../src/content/cow-gulch';
import { GAME_RULES_VERSION } from '../src/game';
import { SerialBatchInputError, parseSerialBatchInput } from '../src/cli/batch-input';

const validInput = {
  schemaVersion: 1,
  batchId: 'cow-gulch-smoke',
  samples: [
    { id: 'seed-42-a', randomSeed: 42 },
    { id: 'seed-42-b', randomSeed: 42 },
  ],
};

test('parses a bounded serial batch into the exact Cow Gulch and policy versions', () => {
  const request = parseSerialBatchInput(validInput);
  assert.equal(request.batchId, 'cow-gulch-smoke');
  assert.equal(request.scenario.id, 'cow-gulch-single-wave');
  assert.equal(request.scenario.gameScenarioId, cowGulchContent.id);
  assert.equal(request.scenario.contentVersion, cowGulchContent.contentVersion);
  assert.equal(request.scenario.rulesVersion, GAME_RULES_VERSION);
  assert.equal(request.scenario.maxFrames, 2_000);
  assert.equal(request.policy.id, 'start-wave');
  assert.deepEqual(request.samples, validInput.samples);
});

test('accepts only bounded budget overrides and rejects unsupported file shapes', () => {
  const request = parseSerialBatchInput({
    ...validInput,
    budgets: { maxFrames: 1, maxWallClockMs: 10 },
  });
  assert.equal(request.scenario.maxFrames, 1);
  assert.equal(request.scenario.maxWallClockMs, 10);
  assert.equal(request.scenario.maxSimulatedMs, 200_000);

  assert.throws(
    () => parseSerialBatchInput({ ...validInput, executable: 'arbitrary code' }),
    (error) => error instanceof SerialBatchInputError && error.code === 'invalid-input',
  );
  assert.throws(
    () => parseSerialBatchInput({ ...validInput, budgets: { maxFrames: 250_001 } }),
    (error) => error instanceof SerialBatchInputError && error.code === 'invalid-input',
  );
});

test('rejects duplicate sample IDs, invalid seeds, and batches over the sample limit', () => {
  assert.throws(
    () => parseSerialBatchInput({ ...validInput, samples: [
      { id: 'same-id', randomSeed: 1 },
      { id: 'same-id', randomSeed: 2 },
    ] }),
    (error) => error instanceof SerialBatchInputError && error.code === 'invalid-input',
  );
  assert.throws(
    () => parseSerialBatchInput({ ...validInput, samples: [{ id: 'too-large', randomSeed: 0x1_0000_0000 }] }),
    (error) => error instanceof SerialBatchInputError && error.code === 'invalid-input',
  );
  assert.throws(
    () => parseSerialBatchInput({ ...validInput, samples: Array.from({ length: 26 }, (_, index) => ({ id: `seed-${index}`, randomSeed: index })) }),
    (error) => error instanceof SerialBatchInputError && error.code === 'invalid-input',
  );
});
