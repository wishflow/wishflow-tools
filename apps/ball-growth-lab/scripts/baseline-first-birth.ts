import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { SimulationWorkerPool, summarizeRuns, exportResults, kaplanMeierQuantile, type SimulationOutcome } from '@wishflow/simulation-testkit';
import { DEFAULT_CONFIG } from '../src/types';

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerCount = Math.max(1, Number(process.env.SIMULATION_WORKERS ?? 4));
const sampleCount = Math.max(1, Number(process.env.FIRST_BIRTH_SEEDS ?? 40));
const observationWindowSeconds = Math.max(1, Number(process.env.FIRST_BIRTH_WINDOW_SECONDS ?? 180));
const seeds = Array.from({ length: sampleCount }, (_, index) => `BASE-${(index + 1).toString(36).toUpperCase().padStart(5, '0')}`);
const config = { ...DEFAULT_CONFIG, initialCount: 2, maxPopulation: 1000 };

const pool = new SimulationWorkerPool({
  size: workerCount,
  scenario: { moduleUrl: pathToFileURL(path.join(appDirectory, 'src/scenario.ts')).href },
});

let outcomes: SimulationOutcome[];
try {
  outcomes = await pool.createScenario().runBatch(seeds.map((seed) => ({
    config,
    seed,
    sampleOptions: { maxElapsedSeconds: observationWindowSeconds, stopAtFirstBirth: true },
  })));
} finally {
  await pool.close();
}

const firstBirthObservations = outcomes.flatMap((outcome) => {
  if (outcome.status !== 'succeeded') return [];
  const eventTime = outcome.result.metrics.firstBirthSeconds;
  const elapsed = outcome.result.metrics.elapsedSeconds;
  return [{
    time: typeof eventTime === 'number' ? eventTime : typeof elapsed === 'number' ? elapsed : observationWindowSeconds,
    event: typeof eventTime === 'number',
  }];
});

const report = {
  format: 'ball-growth-lab.first-birth-baseline',
  version: 1,
  config,
  sampleCount,
  observationWindowSeconds,
  workerCount,
  summary: summarizeRuns(outcomes),
  firstBirthDistribution: {
    events: outcomes.filter((outcome) => outcome.status === 'succeeded' && typeof outcome.result.metrics.firstBirthSeconds === 'number').length,
    rightCensored: outcomes.filter((outcome) => outcome.status === 'succeeded' && typeof outcome.result.metrics.firstBirthSeconds !== 'number').length,
    p10Seconds: kaplanMeierQuantile(firstBirthObservations, 0.1),
    p50Seconds: kaplanMeierQuantile(firstBirthObservations, 0.5),
    p90Seconds: kaplanMeierQuantile(firstBirthObservations, 0.9),
  },
  uncensoredFirstBirthSeconds: outcomes.flatMap((outcome) => (
    outcome.status === 'succeeded' && typeof outcome.result.metrics.firstBirthSeconds === 'number'
      ? [outcome.result.metrics.firstBirthSeconds]
      : []
  )),
  outcomes,
};
const outputPath = path.resolve(process.env.FIRST_BIRTH_OUTPUT ?? 'reports/first-birth-baseline.json.gz');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, gzipSync(JSON.stringify(report)));
const outputStem = outputPath.replace(/\.json(?:\.gz)?$/i, '');
const summaryPath = `${outputStem}-summary.json`;
await writeFile(summaryPath, JSON.stringify({
  format: report.format,
  version: report.version,
  config,
  sampleCount,
  observationWindowSeconds,
  workerCount,
  summary: report.summary,
  firstBirthDistribution: report.firstBirthDistribution,
  uncensoredFirstBirthSeconds: report.uncensoredFirstBirthSeconds,
}, null, 2));
await writeFile(`${outputStem}.csv`, exportResults(outcomes, 'csv'));
console.log(JSON.stringify({
  summary: report.summary,
  firstBirthDistribution: report.firstBirthDistribution,
  uncensoredFirstBirthSeconds: report.uncensoredFirstBirthSeconds,
  outputPath,
  summaryPath,
}, null, 2));
