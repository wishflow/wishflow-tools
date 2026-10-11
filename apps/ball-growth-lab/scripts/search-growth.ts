import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  SimulationWorkerPool,
  kaplanMeierQuantile,
  percentile,
  timeToThreshold,
  type SimulationOutcome,
} from '@wishflow/simulation-testkit';
import { DEFAULT_CONFIG, type SimulationConfig } from '../src/types';
import modelData from '../src/growth-model.json';
import { configKey, isGrowthPredictionValidated, type GrowthModelArtifact } from '../src/growthModel';

const firstBirthCapSeconds = Number(process.env.FIRST_BIRTH_CAP_SECONDS);
if (!Number.isFinite(firstBirthCapSeconds) || firstBirthCapSeconds <= 0) {
  throw new Error('请先根据首繁殖基线设置 FIRST_BIRTH_CAP_SECONDS。');
}

const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerCount = Math.max(1, Number(process.env.SIMULATION_WORKERS ?? 4));
const seedCount = Math.max(2, Number(process.env.SEARCH_SEEDS ?? 24));
const observationCeiling = Math.max(1, Number(process.env.SEARCH_OBSERVATION_SECONDS ?? 300));
const outputDirectory = path.resolve(process.env.SEARCH_OUTPUT_DIR ?? 'reports');
const fixedConfig: SimulationConfig = {
  ...DEFAULT_CONFIG,
  initialCount: 2,
  maxPopulation: 1000,
  restitution: 1,
  birthProbability: 1,
};
const growthModel = modelData as unknown as GrowthModelArtifact;

interface Candidate {
  id: string;
  config: SimulationConfig;
}

interface ThresholdMetrics {
  t10To90: number | null;
  slopes: Array<number | null>;
  reachesTarget: boolean;
}

function buildCandidates(): Candidate[] {
  const candidates = new Map<string, Candidate>();
  const add = (name: string, patch: Partial<SimulationConfig>) => {
    const config = { ...fixedConfig, ...patch };
    const key = configKey(config);
    if (!candidates.has(key)) candidates.set(key, { id: name, config });
  };

  add('baseline', {});
  for (const value of [16, 18, 22, 24]) add(`arena-${value}`, { arenaSize: value });
  for (const value of [0.012, 0.016, 0.020, 0.028, 0.032, 0.036]) add(`diameter-${value}`, { ballDiameterRatio: value });
  for (const value of [5, 7, 9, 14, 18, 24]) add(`speed-${value}`, { initialSpeed: value });
  for (const value of [0, 0.15, 0.45, 0.6, 0.8, 1]) add(`speed-spread-${value}`, { speedSpread: value });
  for (const value of [0, 90, 180]) add(`direction-${value}`, { initialDirection: value });
  for (const value of [0, 45, 90, 135, 180]) add(`direction-spread-${value}`, { directionSpread: value });
  for (const value of [2, 5, 9.8, 15, 20]) add(`gravity-${value}`, { gravity: value });
  for (const value of [1, 2, 4, 8]) add(`gaps-${value}`, { gapCount: value });
  for (const value of [1.05, 1.5, 2.5, 3]) add(`gap-width-${value}`, { gapCount: 2, gapWidthRatio: value });

  const interactions: Array<[string, Partial<SimulationConfig>]> = [
    ['small-tight-fast', { arenaSize: 16, ballDiameterRatio: 0.036, initialSpeed: 24 }],
    ['large-sparse-slow', { arenaSize: 24, ballDiameterRatio: 0.012, initialSpeed: 5 }],
    ['gravity-upward-wide', { gravity: 9.8, initialDirection: 270, directionSpread: 180 }],
    ['gravity-with-gaps', { gravity: 4, gapCount: 2, gapWidthRatio: 3 }],
    ['many-narrow-gaps', { gapCount: 8, gapWidthRatio: 1.05, initialSpeed: 16 }],
    ['wide-single-gap', { gapCount: 1, gapWidthRatio: 3, initialDirection: 90 }],
    ['fast-small-arena', { arenaSize: 16, initialSpeed: 24, speedSpread: 0.6 }],
    ['large-arena-low-gravity', { arenaSize: 24, gravity: 2, initialDirection: 225, directionSpread: 90 }],
  ];
  for (const [name, patch] of interactions) add(name, patch);
  return [...candidates.values()];
}

function firstBirthSummary(outcomes: SimulationOutcome[]) {
  const observations = outcomes.flatMap((outcome) => {
    if (outcome.status !== 'succeeded') return [];
    const firstBirth = outcome.result.metrics.firstBirthSeconds;
    const elapsed = outcome.result.metrics.elapsedSeconds;
    return [{
      time: typeof firstBirth === 'number' ? firstBirth : typeof elapsed === 'number' ? elapsed : firstBirthCapSeconds,
      event: typeof firstBirth === 'number',
    }];
  });
  const sortedEvents = observations.filter((observation) => observation.event).map((observation) => observation.time);
  return {
    samples: observations.length,
    events: sortedEvents.length,
    rightCensored: observations.length - sortedEvents.length,
    p10Seconds: kaplanMeierQuantile(observations, 0.1),
    p50Seconds: kaplanMeierQuantile(observations, 0.5),
    p90Seconds: kaplanMeierQuantile(observations, 0.9),
    eventProbabilityByCap: sortedEvents.length / Math.max(1, observations.length),
  };
}

function thresholds(outcome: SimulationOutcome): ThresholdMetrics | null {
  if (outcome.status !== 'succeeded') return null;
  const points = outcome.result.timeSeries;
  const exactT10To90 = outcome.result.metrics.t10To90Seconds;
  const times = [2, 10, 100, 500, 900].map((population) => timeToThreshold(points, population));
  const slopes = times.slice(0, -1).map((time, index) => {
    const next = times[index + 1];
    return time === null || next === null || next <= time ? null : ([8, 90, 400, 400][index] / (next - time));
  });
  return {
    t10To90: typeof exactT10To90 === 'number'
      ? exactT10To90
      : times[2] !== null && times[4] !== null && times[4] > times[2] ? times[4] - times[2] : null,
    slopes,
    reachesTarget: outcome.result.endReason === 'population-target',
  };
}

function summarizeCandidate(candidate: Candidate, firstBirth: SimulationOutcome[], growth: SimulationOutcome[]) {
  const birth = firstBirthSummary(firstBirth);
  const trajectories = growth.map(thresholds).filter((value): value is ThresholdMetrics => value !== null);
  const t10To90 = trajectories.flatMap((value) => value.t10To90 === null ? [] : [value.t10To90]);
  const completedTrajectories = trajectories.filter((value) => value.t10To90 !== null);
  const perRunPeakSlopes = completedTrajectories.flatMap((trajectory) => {
    const slopes = trajectory.slopes.filter((value): value is number => value !== null);
    return slopes.length ? [Math.max(...slopes)] : [];
  });
  const averageT10To90Slopes = t10To90.map((duration) => 800 / duration);
  const finalPopulations = growth.flatMap((outcome) => {
    if (outcome.status !== 'succeeded') return [];
    const population = outcome.result.metrics.finalPopulation;
    return typeof population === 'number' && Number.isFinite(population) ? [population] : [];
  });
  const stageSlopes = [0, 1, 2, 3].map((stage) => {
    const values = trajectories.flatMap((trajectory) => trajectory.slopes[stage] === null ? [] : [trajectory.slopes[stage]!]);
    return values.length ? percentile(values, 0.5) : null;
  });
  const completedTarget = growth.filter((outcome) => outcome.status === 'succeeded' && outcome.result.endReason === 'population-target').length;
  const earlyEnds = growth.filter((outcome) => outcome.status === 'succeeded' && (outcome.result.endReason === 'single-ball' || outcome.result.endReason === 'no-balls')).length;
  const reachedT10To90 = t10To90.length;
  return {
    id: candidate.id,
    config: candidate.config,
    predictionValidated: isGrowthPredictionValidated(candidate.config, growthModel),
    firstBirth: birth,
    eligibleByWaitCap: birth.samples === seedCount && birth.p90Seconds !== null && birth.p90Seconds <= firstBirthCapSeconds,
    growth: {
      runs: growth.length,
      t10To90MedianSeconds: t10To90.length ? percentile(t10To90, 0.5) : null,
      t10To90P10Seconds: t10To90.length ? percentile(t10To90, 0.1) : null,
      t10To90P90Seconds: t10To90.length ? percentile(t10To90, 0.9) : null,
      t10To90CompletionRate: reachedT10To90 / Math.max(1, growth.length),
      averageT10To90SlopeMedianBallsPerSecond: averageT10To90Slopes.length ? percentile(averageT10To90Slopes, 0.5) : null,
      averageT10To90SlopeP90BallsPerSecond: averageT10To90Slopes.length ? percentile(averageT10To90Slopes, 0.9) : null,
      observationWindowFinalPopulationP10: finalPopulations.length ? percentile(finalPopulations, 0.1) : null,
      observationWindowFinalPopulationP50: finalPopulations.length ? percentile(finalPopulations, 0.5) : null,
      observationWindowFinalPopulationP90: finalPopulations.length ? percentile(finalPopulations, 0.9) : null,
      stageSlopeMedianBallsPerSecond: stageSlopes,
      peakStageSlopeMedianBallsPerSecond: stageSlopes.some((value) => value !== null) ? Math.max(...stageSlopes.filter((value): value is number => value !== null)) : null,
      peakStageSlopeP90BallsPerSecond: perRunPeakSlopes.length ? percentile(perRunPeakSlopes, 0.9) : null,
      seedToSeedT10To90SpreadSeconds: t10To90.length > 1 ? percentile(t10To90, 0.9) - percentile(t10To90, 0.1) : null,
      targetCompletionProbability: completedTarget / Math.max(1, growth.length),
      earlyTerminationProbability: earlyEnds / Math.max(1, growth.length),
      rightCensoredOrIncomplete: growth.filter((outcome) => outcome.status === 'succeeded' && outcome.result.endReason === 'observation-window').length,
      endReasons: growth.reduce<Record<string, number>>((counts, outcome) => {
        const reason = outcome.status === 'succeeded' ? outcome.result.endReason ?? 'unknown' : 'failed';
        counts[reason] = (counts[reason] ?? 0) + 1;
        return counts;
      }, {}),
    },
  };
}

function paretoFrontier(summaries: ReturnType<typeof summarizeCandidate>[]) {
  const eligible = summaries.filter((candidate) => candidate.eligibleByWaitCap
    && candidate.growth.t10To90MedianSeconds !== null
    && candidate.growth.averageT10To90SlopeP90BallsPerSecond !== null
    && candidate.growth.seedToSeedT10To90SpreadSeconds !== null
    && candidate.growth.t10To90CompletionRate !== null
    && candidate.growth.targetCompletionProbability !== null);
  const dominates = (first: typeof eligible[number], second: typeof eligible[number]) => {
    const values = [
      first.growth.t10To90MedianSeconds! >= second.growth.t10To90MedianSeconds!,
      first.growth.averageT10To90SlopeP90BallsPerSecond! <= second.growth.averageT10To90SlopeP90BallsPerSecond!,
      first.firstBirth.p90Seconds! <= second.firstBirth.p90Seconds!,
      first.growth.seedToSeedT10To90SpreadSeconds! <= second.growth.seedToSeedT10To90SpreadSeconds!,
      first.growth.earlyTerminationProbability <= second.growth.earlyTerminationProbability,
      first.growth.t10To90CompletionRate! >= second.growth.t10To90CompletionRate!,
      first.growth.targetCompletionProbability >= second.growth.targetCompletionProbability,
    ];
    const strict = first.growth.t10To90MedianSeconds! > second.growth.t10To90MedianSeconds!
      || first.growth.averageT10To90SlopeP90BallsPerSecond! < second.growth.averageT10To90SlopeP90BallsPerSecond!
      || first.firstBirth.p90Seconds! < second.firstBirth.p90Seconds!
      || first.growth.seedToSeedT10To90SpreadSeconds! < second.growth.seedToSeedT10To90SpreadSeconds!
      || first.growth.earlyTerminationProbability < second.growth.earlyTerminationProbability
      || first.growth.t10To90CompletionRate! > second.growth.t10To90CompletionRate!
      || first.growth.targetCompletionProbability > second.growth.targetCompletionProbability;
    return values.every(Boolean) && strict;
  };
  return eligible.filter((candidate) => !eligible.some((other) => other !== candidate && dominates(other, candidate)));
}

function csv(summaries: ReturnType<typeof summarizeCandidate>[]): string {
  const columns = [
    'id', 'eligibleByWaitCap', 'firstBirthP50Seconds', 'firstBirthP90Seconds', 't10To90MedianSeconds',
    't10To90P10Seconds', 't10To90P90Seconds', 't10To90CompletionRate', 'peakStageSlopeMedianBallsPerSecond',
    'averageT10To90SlopeMedianBallsPerSecond', 'averageT10To90SlopeP90BallsPerSecond',
    'observationWindowFinalPopulationP10', 'observationWindowFinalPopulationP50', 'observationWindowFinalPopulationP90',
    'seedToSeedT10To90SpreadSeconds', 'targetCompletionProbability', 'earlyTerminationProbability', 'predictionValidated', 'pareto', 'config',
  ];
  const frontier = new Set(paretoFrontier(summaries).map((candidate) => candidate.id));
  const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns.map(quote).join(','), ...summaries.map((candidate) => [
    candidate.id,
    candidate.eligibleByWaitCap,
    candidate.firstBirth.p50Seconds,
    candidate.firstBirth.p90Seconds,
    candidate.growth.t10To90MedianSeconds,
    candidate.growth.t10To90P10Seconds,
    candidate.growth.t10To90P90Seconds,
    candidate.growth.t10To90CompletionRate,
    candidate.growth.peakStageSlopeMedianBallsPerSecond,
    candidate.growth.averageT10To90SlopeMedianBallsPerSecond,
    candidate.growth.averageT10To90SlopeP90BallsPerSecond,
    candidate.growth.observationWindowFinalPopulationP10,
    candidate.growth.observationWindowFinalPopulationP50,
    candidate.growth.observationWindowFinalPopulationP90,
    candidate.growth.seedToSeedT10To90SpreadSeconds,
    candidate.growth.targetCompletionProbability,
    candidate.growth.earlyTerminationProbability,
    candidate.predictionValidated,
    frontier.has(candidate.id),
    JSON.stringify(candidate.config),
  ].map(quote).join(','))].join('\n');
}

const candidates = buildCandidates();
const seeds = Array.from({ length: seedCount }, (_, index) => `SEARCH-${(index + 1).toString(36).toUpperCase().padStart(5, '0')}`);
const pool = new SimulationWorkerPool({
  size: workerCount,
  scenario: { moduleUrl: pathToFileURL(path.join(appDirectory, 'src/scenario.ts')).href },
});
const firstBirthRuns = new Map<string, SimulationOutcome[]>();
const growthRuns = new Map<string, SimulationOutcome[]>();
try {
  const scenario = pool.createScenario();
  for (const [index, candidate] of candidates.entries()) {
    const outcomes = await scenario.runBatch(seeds.map((seed, seedIndex) => ({
      id: `first-birth-${String(index + 1).padStart(3, '0')}-${String(seedIndex + 1).padStart(3, '0')}`,
      config: { ...candidate.config, seed },
      seed,
      sampleOptions: { maxElapsedSeconds: firstBirthCapSeconds, stopAtFirstBirth: true },
    })));
    firstBirthRuns.set(configKey(candidate.config), outcomes);
    const summary = firstBirthSummary(outcomes);
    console.log(`首繁殖筛选 ${index + 1}/${candidates.length}：${candidate.id} · P90 ${summary.p90Seconds?.toFixed(1) ?? '未达到'} 秒`);
  }

  const eligible = candidates.filter((candidate) => {
    const summary = firstBirthSummary(firstBirthRuns.get(configKey(candidate.config)) ?? []);
    return summary.samples === seedCount && summary.p90Seconds !== null && summary.p90Seconds <= firstBirthCapSeconds;
  });
  for (const [index, candidate] of eligible.entries()) {
    const outcomes = await scenario.runBatch(seeds.map((seed, seedIndex) => ({
      id: `growth-${String(index + 1).padStart(3, '0')}-${String(seedIndex + 1).padStart(3, '0')}`,
      config: { ...candidate.config, seed },
      seed,
      sampleOptions: { sampleIntervalSeconds: 0.5, maxElapsedSeconds: observationCeiling },
    })));
    growthRuns.set(configKey(candidate.config), outcomes);
    console.log(`增长场景 ${index + 1}/${eligible.length}：${candidate.id} · ${outcomes.length} 个配对种子`);
  }
} finally {
  await pool.close();
}

const summaries = candidates.map((candidate) => summarizeCandidate(
  candidate,
  firstBirthRuns.get(configKey(candidate.config)) ?? [],
  growthRuns.get(configKey(candidate.config)) ?? [],
));
const report = {
  format: 'ball-growth-lab.pareto-search',
  version: 2,
  generatedAt: new Date().toISOString(),
  method: 'paired-seed-one-factor-screen-plus-predeclared-interaction-configurations',
  fixedConditions: fixedConfig,
  growthModel: {
    version: growthModel.version,
    calibrated: growthModel.calibrated,
    validation: growthModel.validation,
  },
  firstBirthCapSeconds,
  observationCeilingSeconds: observationCeiling,
  measurement: {
    growthSampleIntervalSeconds: 0.5,
    t10To90Source: 'per-step threshold crossing metric from the production scenario',
    stageSlopeSource: 'sampled time series; diagnostic only at 0.5 second resolution',
    paretoUsesSampledStageSlope: false,
  },
  workerCount,
  seedCount,
  seeds,
  candidateCount: candidates.length,
  eligibleCount: summaries.filter((candidate) => candidate.eligibleByWaitCap).length,
  paretoIds: paretoFrontier(summaries).map((candidate) => candidate.id),
  optimizationDirections: {
    t10To90MedianSeconds: 'maximize for slower, more gradual growth',
    stageSlopeMedianBallsPerSecond: 'sampled at 0.5 seconds; diagnostic only',
    averageT10To90SlopeP90BallsPerSecond: 'minimize to reduce steep seed outliers',
    firstBirthP90Seconds: 'minimize subject to the chosen cap',
    seedToSeedT10To90SpreadSeconds: 'minimize',
    earlyTerminationProbability: 'minimize',
    t10To90CompletionRate: 'maximize to avoid favoring stalled runs',
    targetCompletionProbability: 'maximize',
  },
  summaries,
  firstBirthRuns: Object.fromEntries(firstBirthRuns),
  growthRuns: Object.fromEntries(growthRuns),
};

await mkdir(outputDirectory, { recursive: true });
const reportName = `growth-pareto-search-${firstBirthCapSeconds}s`;
const summary = {
  format: 'ball-growth-lab.pareto-search-summary',
  version: 1,
  generatedAt: report.generatedAt,
  method: report.method,
  fixedConditions: report.fixedConditions,
  firstBirthCapSeconds,
  observationCeilingSeconds: observationCeiling,
  measurement: report.measurement,
  workerCount,
  seedCount,
  seeds,
  candidateCount: candidates.length,
  eligibleCount: report.eligibleCount,
  growthModel: report.growthModel,
  paretoIds: report.paretoIds,
  optimizationDirections: report.optimizationDirections,
  summaries,
};
await writeFile(path.join(outputDirectory, `${reportName}.json.gz`), gzipSync(Buffer.from(JSON.stringify(report)), { level: 9 }));
await writeFile(path.join(outputDirectory, `${reportName}-summary.json`), JSON.stringify(summary, null, 2));
await writeFile(path.join(outputDirectory, `${reportName}.csv`), csv(summaries));
console.log(JSON.stringify({ eligibleCount: report.eligibleCount, paretoIds: report.paretoIds, outputDirectory }, null, 2));
