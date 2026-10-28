import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ExperimentBatchReport } from '../src/experiments';

const appRoot = fileURLToPath(new URL('..', import.meta.url));

function normalizeResult(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeResult);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['wallClockMs', 'sessionId', 'settlementId'].includes(key))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, normalizeResult(child)]));
}

test('Node worker CLI produces the same ordered run results as serial execution', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gunsnglory-t17-'));
  const inputPath = join(directory, 'batch.json');
  const serialOutputPath = join(directory, 'serial.json');
  const parallelOutputPath = join(directory, 'parallel.json');
  try {
    const example = await readFile(join(appRoot, 'examples/serial-batch.json'), 'utf8');
    await writeFile(inputPath, example, 'utf8');

    const invoke = (outputPath: string, workers?: number) => spawnSync(process.execPath, [
      '--import', 'tsx', 'src/cli/run-batch.ts', '--input', inputPath, '--output', outputPath,
      ...(workers === undefined ? [] : ['--workers', String(workers)]),
    ], { cwd: appRoot, encoding: 'utf8', timeout: 30_000 });

    const serialProcess = invoke(serialOutputPath);
    assert.equal(serialProcess.status, 0, serialProcess.stderr);
    const parallelProcess = invoke(parallelOutputPath, 2);
    assert.equal(parallelProcess.status, 0, parallelProcess.stderr);

    const serial = JSON.parse(await readFile(serialOutputPath, 'utf8')) as { report: Record<string, unknown> };
    const parallel = JSON.parse(await readFile(parallelOutputPath, 'utf8')) as { report: Record<string, unknown> };
    assert.equal(serial.report.maxConcurrency, 1);
    assert.equal(parallel.report.maxConcurrency, 2);
    const sessionIds = (parallel.report.results as { result: { startRecord: { sessionId: string } } }[])
      .map(({ result }) => result.startRecord.sessionId);
    assert.equal(new Set(sessionIds).size, sessionIds.length);
    assert.deepEqual(normalizeResult(parallel.report.results), normalizeResult(serial.report.results));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI rejects worker counts above its concurrency budget', () => {
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', 'src/cli/run-batch.ts', '--input', 'unused.json', '--workers', '5',
  ], { cwd: appRoot, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--workers must be an integer from 1 to 4/);
});

test('parallel workers preserve per-run budget classifications and failed inputs', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gunsnglory-t17-budget-'));
  const inputPath = join(directory, 'batch.json');
  const outputPath = join(directory, 'result.json');
  try {
    await writeFile(inputPath, JSON.stringify({
      schemaVersion: 1,
      batchId: 'parallel-budget',
      samples: [
        { id: 'seed-42', randomSeed: 42 },
        { id: 'seed-43', randomSeed: 43 },
      ],
      budgets: { maxFrames: 1, yieldEveryFrames: 1 },
    }), 'utf8');
    const result = spawnSync(process.execPath, [
      '--import', 'tsx', 'src/cli/run-batch.ts', '--input', inputPath, '--output', outputPath, '--workers', '2',
    ], { cwd: appRoot, encoding: 'utf8', timeout: 30_000 });
    assert.equal(result.status, 1, result.stderr);

    const report = (JSON.parse(await readFile(outputPath, 'utf8')) as { report: ExperimentBatchReport }).report;
    assert.equal(report.status, 'completed');
    assert.equal(report.maxConcurrency, 2);
    assert.equal(report.statusCounts['budget-exceeded'], 2);
    assert.deepEqual(report.failureInputs.map(({ input, stopReason }) => [input.sample.randomSeed, stopReason]), [
      [42, 'max-frames'],
      [43, 'max-frames'],
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
