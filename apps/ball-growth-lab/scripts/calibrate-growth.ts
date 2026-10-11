import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';
import { SimulationWorkerPool, exportResults, summarizeRuns, type SimulationOutcome } from '@wishflow/simulation-testkit';
import { DEFAULT_CONFIG, type SimulationConfig } from '../src/types';
import { configKey, fitGrowthModel, validateGrowthPredictions } from '../src/growthModel';

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerCount = Math.max(1, Number(process.env.SIMULATION_WORKERS ?? 4));
const seedCount = Math.max(2, Number(process.env.CALIBRATION_SEEDS ?? 24));
const minimumValidationSeedsPerConfig = 20;
const outputDirectory = path.resolve(process.env.CALIBRATION_OUTPUT_DIR ?? 'reports');
const observationCeiling = Number(process.env.CALIBRATION_OBSERVATION_CEILING_SECONDS ?? 300);
const sampleInterval = Math.max(0.05, Number(process.env.CALIBRATION_SAMPLE_INTERVAL_SECONDS ?? 0.05));
const common = { ...DEFAULT_CONFIG, initialCount: 2, maxPopulation: 1000, birthProbability: 1, restitution: 1 };
const trainingConfigs: SimulationConfig[] = [
  common,
  { ...common, ballDiameterRatio: 0.016 },
  { ...common, ballDiameterRatio: 0.032 },
  { ...common, initialSpeed: 7 },
  { ...common, initialSpeed: 16, gravity: 2 },
  { ...common, gapCount: 2, gapWidthRatio: 1.5 },
  { ...common, arenaSize: 16 },
  { ...common, arenaSize: 20, ballDiameterRatio: 0.02, initialSpeed: 10, gravity: 3, gapCount: 2, gapWidthRatio: 2, initialDirection: 300 },
  { ...common, arenaSize: 22, ballDiameterRatio: 0.028, initialSpeed: 14, directionSpread: 180 },
  { ...common, arenaSize: 20, ballDiameterRatio: 0.02, initialSpeed: 9, gravity: 4, gapCount: 2, gapWidthRatio: 2, initialDirection: 300 },
];
const validationConfigs: SimulationConfig[] = [
  { ...common, arenaSize: 24, ballDiameterRatio: 0.028, initialSpeed: 14, directionSpread: 180 },
  { ...common, arenaSize: 18, ballDiameterRatio: 0.020, initialSpeed: 9, gravity: 4, gapCount: 2, gapWidthRatio: 2, initialDirection: 300 },
];
const seeds = Array.from({ length: seedCount }, (_, index) => `CAL-${(index + 1).toString(36).toUpperCase().padStart(5, '0')}`);
const groups = [
  ...trainingConfigs.map((config) => ({ role: 'training' as const, config })),
  ...validationConfigs.map((config) => ({ role: 'validation' as const, config })),
];
const scenarioConfigs = new Map(groups.map((group) => [configKey(group.config), group.role]));
const reusableOutcomes = new Map<string, SimulationOutcome>();
const cacheKey = (config: SimulationConfig, seed: string, intervalSeconds: number, maxElapsedSeconds: number | null) =>
  `${configKey(config)}|${seed}|sample=${intervalSeconds}|max=${maxElapsedSeconds ?? 'none'}`;
const reuseReportPath = process.env.CALIBRATION_REUSE_REPORT;
if (reuseReportPath) {
  const reportBytes = await readFile(path.resolve(reuseReportPath));
  const reportText = reuseReportPath.endsWith('.gz') ? gunzipSync(reportBytes).toString('utf8') : reportBytes.toString('utf8');
  const previous = JSON.parse(reportText) as { outcomes?: SimulationOutcome[] };
  for (const outcome of previous.outcomes ?? []) {
    const metadata = outcome.status === 'succeeded'
      ? outcome.result.metadata as { sampleIntervalSeconds?: number; maxElapsedSeconds?: number | null }
      : undefined;
    reusableOutcomes.set(cacheKey(
      outcome.config as SimulationConfig,
      outcome.seed,
      metadata?.sampleIntervalSeconds ?? 0.5,
      metadata?.maxElapsedSeconds ?? 300,
    ), outcome);
  }
}
const pool = new SimulationWorkerPool({
  size: workerCount,
  scenario: { moduleUrl: pathToFileURL(path.join(appDirectory, 'src/scenario.ts')).href },
});

let outcomes: SimulationOutcome[] = [];
let reusedRunCount = 0;
let newRunCount = 0;
try {
  const scenario = pool.createScenario();
  for (const [index, { role, config }] of groups.entries()) {
    const groupOutcomes = Array<SimulationOutcome>(seedCount);
    const pending: Array<{ index: number; task: { config: SimulationConfig; seed: string; sampleOptions: { sampleIntervalSeconds: number; maxElapsedSeconds?: number } } }> = [];
    seeds.forEach((seed, seedIndex) => {
      const key = cacheKey(config, seed, sampleInterval, observationCeiling || null);
      const cached = reusableOutcomes.get(key);
      if (cached) {
        groupOutcomes[seedIndex] = cached;
        reusedRunCount += 1;
      } else {
        pending.push({
          index: seedIndex,
          task: {
            config: { ...config, seed },
            seed,
            sampleOptions: {
              sampleIntervalSeconds: sampleInterval,
              ...(observationCeiling > 0 ? { maxElapsedSeconds: observationCeiling } : {}),
            },
          },
        });
      }
    });
    let completed = 0;
    const progressInterval = Math.max(1, Math.floor(pending.length / 8));
    const fresh = await Promise.all(pending.map(({ task, index: seedIndex }) => scenario.run(
      task.config,
      task.seed,
      task.sampleOptions,
      `calibration-${String(index + 1).padStart(2, '0')}-${String(seedIndex + 1).padStart(3, '0')}`,
    ).then((outcome) => {
      completed += 1;
      if (completed % progressInterval === 0 || completed === pending.length) {
        console.log(`参数组合 ${index + 1}/${groups.length} 已完成 ${completed}/${pending.length} 个新种子`);
      }
      return outcome;
    })));
    pending.forEach(({ index: seedIndex }, resultIndex) => { groupOutcomes[seedIndex] = fresh[resultIndex]; });
    newRunCount += fresh.length;
    outcomes.push(...groupOutcomes);
    const succeeded = groupOutcomes.filter((outcome) => outcome.status === 'succeeded').length;
    console.log(`完成参数组合 ${index + 1}/${groups.length}（${role}）：${succeeded}/${groupOutcomes.length} 个种子成功，复用 ${groupOutcomes.length - fresh.length} 条`);
  }
} finally {
  await pool.close();
}

const trainingRunOutcomes = outcomes.filter((outcome) => scenarioConfigs.get(configKey(outcome.config as SimulationConfig)) === 'training');
const validationRunOutcomes = outcomes.filter((outcome) => scenarioConfigs.get(configKey(outcome.config as SimulationConfig)) === 'validation');
const trainingOutcomes = trainingRunOutcomes as unknown as Parameters<typeof fitGrowthModel>[0];
const validationOutcomes = validationRunOutcomes as unknown as Parameters<typeof validateGrowthPredictions>[0];
const placeholderValidation = {
  t10To90MedianRelativeError: null,
  t10To90CompletionRateAbsoluteError: null,
  intervalCoverage80: null,
  validationRuns: 0,
  minimumSeedsPerConfig: minimumValidationSeedsPerConfig,
  t10To90Target: 0.1,
  intervalCoverageTarget: [0.75, 0.85] as [number, number],
  configurationDiagnostics: [],
  accepted: false,
};
const model = fitGrowthModel(trainingOutcomes, placeholderValidation, validationConfigs.length, validationConfigs);
const validationMetrics = validateGrowthPredictions(validationOutcomes, model);
const validationCounts = new Map<string, number>();
for (const outcome of validationRunOutcomes) {
  if (outcome.status !== 'succeeded') continue;
  const key = configKey(outcome.config as SimulationConfig);
  validationCounts.set(key, (validationCounts.get(key) ?? 0) + 1);
}
const enoughValidationSeeds = validationConfigs.every((config) => (validationCounts.get(configKey(config)) ?? 0) >= minimumValidationSeedsPerConfig);
model.validation = {
  ...placeholderValidation,
  ...validationMetrics,
  validationRuns: validationOutcomes.filter((outcome) => outcome.status === 'succeeded').length,
  accepted: enoughValidationSeeds
    && validationMetrics.t10To90MedianRelativeError !== null
    && validationMetrics.t10To90MedianRelativeError <= 0.1
    && validationMetrics.intervalCoverage80 !== null
    && validationMetrics.intervalCoverage80 >= 0.75
    && validationMetrics.intervalCoverage80 <= 0.85,
};
const report = {
  format: 'ball-growth-lab.growth-calibration',
  version: 3,
  workerCount,
  seedCount,
  reusedRunCount,
  newRunCount,
  observationCeilingSeconds: observationCeiling || null,
  sampleIntervalSeconds: sampleInterval,
  fixedParameters: model.fixedParameters,
  trainingConfigurations: trainingConfigs,
  validationConfigurations: validationConfigs,
  trainingSummary: summarizeRuns(trainingRunOutcomes),
  validationSummary: summarizeRuns(validationRunOutcomes),
  validation: model.validation,
  model,
  outcomes,
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, 'growth-calibration-v2.json.gz'), gzipSync(JSON.stringify(report)));
await writeFile(path.join(outputDirectory, 'growth-calibration-v2-summary.json'), JSON.stringify({
  format: report.format,
  version: report.version,
  workerCount,
  seedCount,
  reusedRunCount,
  newRunCount,
  observationCeilingSeconds: report.observationCeilingSeconds,
  sampleIntervalSeconds: report.sampleIntervalSeconds,
  fixedParameters: report.fixedParameters,
  trainingConfigurations: trainingConfigs,
  validationConfigurations: validationConfigs,
  trainingSummary: report.trainingSummary,
  validationSummary: report.validationSummary,
  validation: model.validation,
  model,
}, null, 2));
await writeFile(path.join(outputDirectory, 'growth-calibration-v2.csv'), exportResults(outcomes, 'csv'));
if (model.validation.accepted) await writeFile(path.join(appDirectory, 'src/growth-model.json'), JSON.stringify(model, null, 2));
console.log(JSON.stringify({
  trainingSummary: report.trainingSummary,
  validationSummary: report.validationSummary,
  validation: model.validation,
  modelPath: model.validation.accepted ? path.join(appDirectory, 'src/growth-model.json') : 'not installed: holdout acceptance thresholds were not met',
}, null, 2));
