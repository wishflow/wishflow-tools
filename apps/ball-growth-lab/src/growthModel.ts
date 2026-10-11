import { CircleBatchSimulation } from './physics/CircleBatchSimulation';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS, type SimulationConfig } from './types';

export interface GrowthModelArtifact {
  format: 'ball-growth-lab.growth-model';
  version: 3;
  trainedAt: string;
  calibrated: boolean;
  trainingConfigCount: number;
  validationConfigCount: number;
  trainingRuns: number;
  validation: {
    t10To90MedianRelativeError: number | null;
    t10To90CompletionRateAbsoluteError: number | null;
    intervalCoverage80: number | null;
    validationRuns: number;
    minimumSeedsPerConfig: number;
    t10To90Target: number;
    intervalCoverageTarget: [number, number];
    configurationDiagnostics: Array<{
      key: string;
      observedCompletionRate: number;
      predictedCompletionRate: number;
      observedT10To90MedianSeconds: number | null;
      predictedT10To90MedianSeconds: number | null;
      predictedT10To90P10Seconds: number | null;
      predictedT10To90P90Seconds: number | null;
      t10To90MedianRelativeError: number | null;
      intervalCoverage80: number | null;
    }>;
    accepted: boolean;
  };
  horizonSeconds: number;
  ranges: Partial<Record<NumericConfigKey, [number, number]>>;
  fixedParameters: { initialCount: number; maxPopulation: number; birthProbability: number; birthCooldown: number; pairCooldown: number; restitution: number };
  regressions: {
    collisionLog: number[];
    birthOpportunityLog: number[];
    cooldownLogit: number[];
    spaceLogit: number[];
    exitLog: number[];
    speedLog: number[];
  };
  rateNoiseSigma: number;
  contactStudy: {
    observations: number;
    medianCorrection: number;
    cooldownAvailability: number;
    spaceAvailability: number;
    meanExitRatePerBallSecond: number;
  };
}

type NumericConfigKey = 'arenaSize' | 'ballDiameterRatio' | 'gapCount' | 'gapWidthRatio' | 'gravity' | 'initialSpeed' | 'speedSpread' | 'initialDirection' | 'directionSpread';
type Outcome = {
  status: 'succeeded' | 'failed';
  config: SimulationConfig;
  seed: string;
  result?: {
    timeSeries: Array<Record<string, number>>;
    endReason: string | null;
    metrics: Record<string, number | string | boolean | null>;
  };
};

const FEATURE_KEYS: NumericConfigKey[] = [
  'arenaSize', 'ballDiameterRatio', 'gapCount', 'gapWidthRatio', 'gravity', 'initialSpeed', 'speedSpread', 'initialDirection', 'directionSpread',
];
const MODEL_INTERNAL_STEP_SECONDS = 0.05;
const STARTUP_PHYSICS_SECONDS = 1;
const STARTUP_PHYSICS_SAMPLE_STEPS = Math.max(1, Math.round(MODEL_INTERNAL_STEP_SECONDS / FIXED_STEP_SECONDS));
const STARTUP_PHYSICS_SAMPLES = Math.ceil(STARTUP_PHYSICS_SECONDS / MODEL_INTERNAL_STEP_SECONDS);

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function logistic(value: number): number {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

function dot(coefficients: number[], features: number[]): number {
  return coefficients.reduce((sum, coefficient, index) => sum + coefficient * (features[index] ?? 0), 0);
}

function solve(matrix: number[][], vector: number[]): number[] {
  const rows = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < rows.length; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < rows.length; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    if (Math.abs(divisor) < 1e-12) continue;
    for (let entry = column; entry < rows.length + 1; entry += 1) rows[column][entry] /= divisor;
    for (let row = 0; row < rows.length; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let entry = column; entry < rows.length + 1; entry += 1) rows[row][entry] -= factor * rows[column][entry];
    }
  }
  return rows.map((row) => Number.isFinite(row.at(-1)) ? row.at(-1)! : 0);
}

function fitLinear(rows: Array<{ features: number[]; target: number; weight?: number }>, ridge = 1e-5): number[] {
  const width = rows[0]?.features.length ?? 0;
  if (width === 0) return [];
  const matrix = Array.from({ length: width }, () => Array(width).fill(0));
  const vector = Array(width).fill(0);
  for (const row of rows) {
    const weight = Math.max(0.001, row.weight ?? 1);
    for (let first = 0; first < width; first += 1) {
      vector[first] += weight * row.features[first] * row.target;
      for (let second = 0; second < width; second += 1) {
        matrix[first][second] += weight * row.features[first] * row.features[second];
      }
    }
  }
  for (let index = 1; index < width; index += 1) matrix[index][index] += ridge;
  matrix[0][0] += ridge * 0.01;
  return solve(matrix, vector);
}

function fitPoisson(rows: Array<{ features: number[]; count: number; exposure: number; weight?: number }>, ridge = 0.25): number[] {
  const width = rows[0]?.features.length ?? 0;
  if (width === 0) return [];
  const coefficients = Array(width).fill(0);
  const objective = (candidate: number[]) => {
    let loss = 0;
    for (const row of rows) {
      const logMean = Math.log(row.exposure) + dot(candidate, row.features);
      const mean = Math.exp(clamp(logMean, -20, 20));
      loss += (row.weight ?? 1) * (mean - row.count * logMean);
    }
    for (let index = 0; index < width; index += 1) {
      const penalty = index === 0 ? ridge * 0.01 : ridge;
      loss += (penalty * candidate[index] ** 2) / 2;
    }
    return loss;
  };

  for (let iteration = 0; iteration < 30; iteration += 1) {
    const hessian = Array.from({ length: width }, () => Array(width).fill(0));
    const gradient = Array(width).fill(0);
    for (const row of rows) {
      const logMean = Math.log(row.exposure) + dot(coefficients, row.features);
      const mean = Math.exp(clamp(logMean, -20, 20));
      const weight = row.weight ?? 1;
      for (let first = 0; first < width; first += 1) {
        gradient[first] += weight * row.features[first] * (mean - row.count);
        for (let second = 0; second < width; second += 1) {
          hessian[first][second] += weight * mean * row.features[first] * row.features[second];
        }
      }
    }
    for (let index = 0; index < width; index += 1) {
      const penalty = index === 0 ? ridge * 0.01 : ridge;
      gradient[index] += penalty * coefficients[index];
      hessian[index][index] += penalty;
    }
    const step = solve(hessian, gradient);
    if (step.every((value) => Math.abs(value) < 1e-6)) break;
    const currentObjective = objective(coefficients);
    let scale = 1;
    let candidate = coefficients.map((value, index) => value - step[index]);
    while (scale > 1 / 128 && objective(candidate) >= currentObjective) {
      scale /= 2;
      candidate = coefficients.map((value, index) => value - scale * step[index]);
    }
    if (scale <= 1 / 128) break;
    for (let index = 0; index < width; index += 1) coefficients[index] = candidate[index];
  }
  return coefficients.map((value) => Number.isFinite(value) ? value : 0);
}

function fitBinomial(rows: Array<{ features: number[]; successes: number; trials: number; weight?: number }>, ridge = 0.5): number[] {
  const width = rows[0]?.features.length ?? 0;
  if (width === 0) return [];
  const coefficients = Array(width).fill(0);
  const totalSuccesses = rows.reduce((sum, row) => sum + row.successes, 0);
  const totalTrials = rows.reduce((sum, row) => sum + row.trials, 0);
  coefficients[0] = Math.log((totalSuccesses + 0.5) / (totalTrials - totalSuccesses + 0.5));
  const objective = (candidate: number[]) => {
    let loss = 0;
    for (const row of rows) {
      const probability = logistic(clamp(dot(candidate, row.features), -20, 20));
      const weight = row.weight ?? 1;
      loss -= weight * row.successes * Math.log(Math.max(probability, 1e-12));
      loss += weight * (row.trials - row.successes) * -Math.log(Math.max(1 - probability, 1e-12));
    }
    for (let index = 0; index < width; index += 1) {
      const penalty = index === 0 ? ridge * 0.01 : ridge;
      loss += (penalty * candidate[index] ** 2) / 2;
    }
    return loss;
  };

  for (let iteration = 0; iteration < 30; iteration += 1) {
    const hessian = Array.from({ length: width }, () => Array(width).fill(0));
    const gradient = Array(width).fill(0);
    for (const row of rows) {
      const probability = logistic(clamp(dot(coefficients, row.features), -20, 20));
      const weight = row.weight ?? 1;
      const variance = Math.max(1e-6, weight * row.trials * probability * (1 - probability));
      for (let first = 0; first < width; first += 1) {
        gradient[first] += weight * row.features[first] * (row.trials * probability - row.successes);
        for (let second = 0; second < width; second += 1) {
          hessian[first][second] += variance * row.features[first] * row.features[second];
        }
      }
    }
    for (let index = 0; index < width; index += 1) {
      const penalty = index === 0 ? ridge * 0.01 : ridge;
      gradient[index] += penalty * coefficients[index];
      hessian[index][index] += penalty;
    }
    const step = solve(hessian, gradient);
    if (step.every((value) => Math.abs(value) < 1e-6)) break;
    const currentObjective = objective(coefficients);
    let scale = 1;
    let candidate = coefficients.map((value, index) => value - step[index]);
    while (scale > 1 / 128 && objective(candidate) >= currentObjective) {
      scale /= 2;
      candidate = coefficients.map((value, index) => value - scale * step[index]);
    }
    if (scale <= 1 / 128) break;
    for (let index = 0; index < width; index += 1) coefficients[index] = candidate[index];
  }
  return coefficients.map((value) => Number.isFinite(value) ? value : 0);
}

function arenaArea(config: SimulationConfig): number {
  return Math.PI * (config.arenaSize / 2) ** 2;
}

function ballDiameter(config: SimulationConfig): number {
  return config.arenaSize * config.ballDiameterRatio;
}

function packingFraction(config: SimulationConfig, population: number): number {
  return population * config.ballDiameterRatio ** 2;
}

function gapFraction(config: SimulationConfig): number {
  return clamp(config.gapCount * ballDiameter(config) * config.gapWidthRatio / (Math.PI * config.arenaSize), 0, 0.95);
}

function gravityRatio(config: SimulationConfig): number {
  return config.gravity * config.arenaSize / Math.max(config.initialSpeed ** 2, 0.25);
}

function speedReference(config: SimulationConfig): number {
  return Math.max(0.05, config.initialSpeed * Math.sqrt(1 + config.speedSpread ** 2 / 3));
}

function collisionFeatures(config: SimulationConfig, population: number): number[] {
  const packing = packingFraction(config, population);
  const gap = gapFraction(config);
  const gravity = gravityRatio(config);
  const hasGap = config.gapCount > 0 ? 1 : 0;
  const cluster = 1 / Math.sqrt(Math.max(config.initialCount, population));
  return [
    1,
    packing,
    packing ** 2,
    packing ** 3,
    cluster,
    hasGap,
    hasGap * cluster,
    gap,
    gravity,
    hasGap * gravity,
    hasGap * Math.sin(config.initialDirection * Math.PI / 180),
    gap * gravity,
    config.speedSpread,
    config.directionSpread / 180,
    Math.sin(config.initialDirection * Math.PI / 180),
    packing * hasGap * gravity,
    packing ** 2 * hasGap * gravity,
    packing * gap * gravity,
  ];
}

function cooldownFeatures(config: SimulationConfig, population: number, meanSpeed: number, collisionRate: number | undefined): number[] {
  const pairCount = Math.max(1, population * (population - 1) / 2);
  const pairRate = (collisionRate ?? (population * (population - 1) * ballDiameter(config) * Math.SQRT2 * meanSpeed / arenaArea(config))) / pairCount;
  return [1, Math.log1p(pairRate * config.pairCooldown), packingFraction(config, population), packingFraction(config, population) ** 2, config.gapCount > 0 ? 1 : 0];
}

function spaceFeatures(config: SimulationConfig, population: number): number[] {
  const packing = packingFraction(config, population);
  const gap = gapFraction(config);
  const gravity = gravityRatio(config);
  const hasGap = config.gapCount > 0 ? 1 : 0;
  return [
    1,
    packing,
    packing ** 2,
    packing ** 3,
    packing ** 4,
    gap,
    packing * gap,
    packing ** 2 * gap,
    hasGap,
    gravity,
    packing * gravity,
    packing ** 2 * gravity,
    gap * gravity,
    hasGap * gravity,
    packing * hasGap * gravity,
  ];
}

function exitFeatures(config: SimulationConfig, population: number): number[] {
  const gap = gapFraction(config);
  const gravity = gravityRatio(config);
  const hasGap = config.gapCount > 0 ? 1 : 0;
  const outwardDirection = Math.max(0, -Math.sin(config.initialDirection * Math.PI / 180));
  const spread = config.directionSpread / 180;
  const inversePopulation = 1 / Math.max(config.initialCount, population);
  return [
    1,
    gap,
    hasGap,
    gravity,
    hasGap * gravity,
    hasGap * outwardDirection,
    hasGap * spread,
    hasGap * outwardDirection * spread,
    config.speedSpread,
    Math.sqrt(inversePopulation),
    inversePopulation,
  ];
}

function speedFeatures(config: SimulationConfig, population: number, time: number, horizon: number): number[] {
  const gravity = gravityRatio(config);
  const phase = clamp(time / Math.max(1, horizon), 0, 1.5);
  const direction = Math.sin(config.initialDirection * Math.PI / 180);
  const spread = config.directionSpread / 180;
  const packing = packingFraction(config, population);
  const hasGap = config.gapCount > 0 ? 1 : 0;
  return [
    1,
    gravity,
    phase,
    gravity * phase,
    gravity * phase ** 2,
    phase ** 2,
    direction * phase,
    spread,
    gravity * spread * phase,
    packing,
    packing ** 2,
    hasGap * packing,
    gravity * packing,
  ];
}

function intervalRows(outcome: Outcome) {
  if (outcome.status !== 'succeeded' || !outcome.result) return [];
  const { config } = outcome;
  const points = outcome.result.timeSeries;
  const rows: Array<{
    config: SimulationConfig;
    time: number;
    population: number;
    meanSpeed: number;
    dt: number;
    collisions: number;
    closingSpeed: number;
    cooldownAccepted: number;
    cooldownRejected: number;
    births: number;
    probabilityPassed: number;
    spaceAttempts: number;
    exits: number;
  }> = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const dt = current.time - previous.time;
    if (dt <= 0 || previous.population <= 0) continue;
    const meanSpeed = (previous.speedSum + current.speedSum) / Math.max(1, previous.population + current.population);
    rows.push({
      config,
      time: (previous.time + current.time) / 2,
      population: (previous.population + current.population) / 2,
      meanSpeed,
      dt,
      collisions: current.collisionEvents - previous.collisionEvents,
      closingSpeed: current.collisionClosingSpeedSum - previous.collisionClosingSpeedSum,
      cooldownAccepted: current.cooldownAccepted - previous.cooldownAccepted,
      cooldownRejected: current.cooldownRejected - previous.cooldownRejected,
      births: current.births - previous.births,
      probabilityPassed: current.birthProbabilityPassed - previous.birthProbabilityPassed,
      spaceAttempts: current.birthSpaceAttempts - previous.birthSpaceAttempts,
      exits: current.exits - previous.exits,
    });
  }
  return rows;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const index = clamp(Math.ceil(q * sorted.length) - 1, 0, sorted.length - 1);
  return sorted[index];
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return Number.NaN;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function fitGrowthModel(
  trainingOutcomes: Outcome[],
  validation: GrowthModelArtifact['validation'],
  validationConfigCount: number,
  validationConfigs: SimulationConfig[] = [],
): GrowthModelArtifact {
  const successful = trainingOutcomes.filter((outcome) => outcome.status === 'succeeded' && outcome.result);
  const rows = successful.flatMap(intervalRows);
  const horizonSeconds = Math.max(1, ...successful.map((outcome) => outcome.result!.metrics.elapsedSeconds as number));
  const collisionRows: Array<{ features: number[]; count: number; exposure: number; weight?: number }> = [];
  const birthOpportunityRows: Array<{ features: number[]; count: number; exposure: number; weight?: number }> = [];
  const cooldownRows: Array<{ features: number[]; successes: number; trials: number; weight?: number }> = [];
  const spaceRows: Array<{ features: number[]; successes: number; trials: number; weight?: number }> = [];
  const exitRows: Array<{ features: number[]; count: number; exposure: number; weight?: number }> = [];
  const speedRows: Array<{ features: number[]; target: number; weight: number }> = [];
  const observedCorrections: number[] = [];
  let acceptedContacts = 0;
  let rejectedContacts = 0;
  let successfulBirths = 0;
  let birthSpaceAttempts = 0;
  let totalExits = 0;
  let ballSeconds = 0;

  for (const row of rows) {
    const { config, population, meanSpeed, dt } = row;
    if (row.time >= STARTUP_PHYSICS_SECONDS) {
      const baseCollisionRate = population * (population - 1) * ballDiameter(config) * Math.SQRT2 * meanSpeed / arenaArea(config);
      const expectedCollisions = baseCollisionRate * dt;
      if (expectedCollisions > 1e-9) {
        const features = collisionFeatures(config, population);
        collisionRows.push({ features, count: row.collisions, exposure: expectedCollisions, weight: 1 / (1 + expectedCollisions) });
        birthOpportunityRows.push({ features, count: row.spaceAttempts, exposure: expectedCollisions });
        if (expectedCollisions > 0.002) {
          observedCorrections.push(clamp((row.collisions + 0.5) / (expectedCollisions + 0.5), 0.005, 200));
        }
        const cooldownSuccesses = row.cooldownAccepted;
        const cooldownTotal = row.cooldownAccepted + row.cooldownRejected;
        if (cooldownTotal > 0) cooldownRows.push({
          features: cooldownFeatures(config, population, meanSpeed, row.collisions / dt),
          successes: cooldownSuccesses,
          trials: cooldownTotal,
        });
        acceptedContacts += row.cooldownAccepted;
        rejectedContacts += row.cooldownRejected;
      }

      if (row.spaceAttempts > 0) {
        spaceRows.push({
          features: spaceFeatures(config, population),
          successes: row.births,
          trials: row.spaceAttempts,
        });
        successfulBirths += row.births;
        birthSpaceAttempts += row.spaceAttempts;
      }
      if (population > 0) {
        const exposure = population * dt;
        exitRows.push({ features: exitFeatures(config, population), count: row.exits, exposure, weight: 1 / Math.sqrt(1 + exposure) });
        totalExits += row.exits;
        ballSeconds += population * dt;
      }
    }
    if (meanSpeed > 0) {
      const speedRatio = meanSpeed / speedReference(config);
      speedRows.push({ features: speedFeatures(config, population, row.time, horizonSeconds), target: Math.log(Math.max(0.05, speedRatio)), weight: Math.sqrt(population) });
    }
  }

  const regressions = {
    collisionLog: fitPoisson(collisionRows),
    birthOpportunityLog: fitPoisson(birthOpportunityRows),
    cooldownLogit: fitBinomial(cooldownRows),
    spaceLogit: fitBinomial(spaceRows),
    exitLog: fitPoisson(exitRows),
    speedLog: fitLinear(speedRows),
  };
  const residuals = birthOpportunityRows.map((row) => {
    const expected = row.exposure * Math.exp(clamp(dot(regressions.birthOpportunityLog, row.features), -10, 10));
    return Math.log((row.count + 0.5) / (expected + 0.5));
  });
  const meanResidual = residuals.reduce((sum, residual) => sum + residual, 0) / Math.max(1, residuals.length);
  const rateNoiseSigma = clamp(Math.sqrt(residuals.reduce((sum, residual) => sum + (residual - meanResidual) ** 2, 0) / Math.max(1, residuals.length)), 0.08, 1.2);
  const ranges: GrowthModelArtifact['ranges'] = {};
  for (const key of FEATURE_KEYS) {
    const values = [...successful.map((outcome) => outcome.config[key]), ...validationConfigs.map((config) => config[key])];
    if (values.length) ranges[key] = [Math.min(...values), Math.max(...values)];
  }
  const corrections = [...observedCorrections].sort((first, second) => first - second);
  return {
    format: 'ball-growth-lab.growth-model',
    version: 3,
    trainedAt: new Date().toISOString(),
    calibrated: successful.length > 0 && birthOpportunityRows.length > 0,
    trainingConfigCount: new Set(successful.map((outcome) => configKey(outcome.config))).size,
    validationConfigCount,
    trainingRuns: successful.length,
    validation,
    horizonSeconds,
    ranges,
    fixedParameters: {
      initialCount: successful[0]?.config.initialCount ?? 2,
      maxPopulation: successful[0]?.config.maxPopulation ?? 1000,
      birthProbability: successful[0]?.config.birthProbability ?? DEFAULT_CONFIG.birthProbability,
      birthCooldown: successful[0]?.config.birthCooldown ?? DEFAULT_CONFIG.birthCooldown,
      pairCooldown: successful[0]?.config.pairCooldown ?? 0.7,
      restitution: successful[0]?.config.restitution ?? 1,
    },
    regressions,
    rateNoiseSigma,
    contactStudy: {
      observations: rows.length,
      medianCorrection: median(corrections),
      cooldownAvailability: acceptedContacts / Math.max(1, acceptedContacts + rejectedContacts),
      spaceAvailability: successfulBirths / Math.max(1, birthSpaceAttempts),
      meanExitRatePerBallSecond: totalExits / Math.max(1, ballSeconds),
    },
  };
}

export function configKey(config: SimulationConfig): string {
  return FEATURE_KEYS.map((key) => `${key}=${config[key]}`).join('|');
}

export function isGrowthPredictionValidated(config: SimulationConfig, model: GrowthModelArtifact | null | undefined): boolean {
  if (!model?.calibrated || !model.validation.accepted || config.shape !== 'circle'
    || config.initialCount !== model.fixedParameters.initialCount
    || config.maxPopulation !== model.fixedParameters.maxPopulation
    || config.birthProbability !== model.fixedParameters.birthProbability
    || config.birthCooldown !== model.fixedParameters.birthCooldown
    || config.pairCooldown !== model.fixedParameters.pairCooldown
    || config.restitution !== model.fixedParameters.restitution) return false;
  return FEATURE_KEYS.every((key) => {
    const range = model.ranges[key];
    return !range || (config[key] >= range[0] - 1e-9 && config[key] <= range[1] + 1e-9);
  });
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(random: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(Math.PI * 2 * random());
}

function poisson(lambda: number, random: () => number): number {
  if (lambda <= 0) return 0;
  if (lambda < 24) {
    const limit = Math.exp(-lambda);
    let product = 1;
    let count = 0;
    do {
      count += 1;
      product *= random();
    } while (product > limit);
    return count - 1;
  }
  return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal(random)));
}

export interface GrowthPredictionPoint {
  time: number;
  p10: number;
  p50: number;
  p90: number;
}

interface StartupState {
  populations: number[];
  meanSpeeds: number[];
  ended: boolean;
}

function simulateStartup(config: SimulationConfig, seed: string): StartupState {
  const simulation = new CircleBatchSimulation({ ...config, seed });
  const populations = [simulation.populationCount];
  const initial = simulation.getSnapshot();
  const meanSpeeds = [initial.stats.speedSum / Math.max(1, simulation.populationCount)];
  const totalPhysicsSteps = Math.ceil(STARTUP_PHYSICS_SECONDS / FIXED_STEP_SECONDS);
  let ended = simulation.isEnded;
  try {
    for (let step = 1; step <= totalPhysicsSteps; step += 1) {
      if (!simulation.isEnded) simulation.step(FIXED_STEP_SECONDS);
      if (step % STARTUP_PHYSICS_SAMPLE_STEPS !== 0 && step !== totalPhysicsSteps) continue;
      const snapshot = simulation.getSnapshot();
      const count = simulation.populationCount;
      populations.push(count);
      meanSpeeds.push(snapshot.stats.speedSum / Math.max(1, count));
      ended ||= simulation.isEnded;
    }
  } finally {
    simulation.dispose();
  }
  while (populations.length <= STARTUP_PHYSICS_SAMPLES) {
    populations.push(populations.at(-1) ?? 0);
    meanSpeeds.push(meanSpeeds.at(-1) ?? 0);
  }
  return { populations, meanSpeeds, ended };
}

function simulateGrowthPaths(
  config: SimulationConfig,
  model: GrowthModelArtifact,
  options: { replicates: number; intervalSeconds: number; seed: string },
): number[][] {
  const replicates = Math.max(20, Math.floor(options.replicates));
  const interval = Math.max(0.05, options.intervalSeconds);
  const internalStep = MODEL_INTERNAL_STEP_SECONDS;
  const maxSteps = Math.max(1, Math.floor(model.horizonSeconds / internalStep));
  const sampleSteps = Math.max(1, Math.round(interval / internalStep));
  const trajectoryTarget = Math.max(config.maxPopulation, config.initialCount);
  const expectedSampleCount = Math.floor(maxSteps / sampleSteps) + 1;
  return Array.from({ length: replicates }, (_, replicate) => {
    const random = seededRandom(`${options.seed}|growth-model-v${model.version}|trajectory-${replicate}`);
    const startup = simulateStartup(config, `${options.seed}|growth-model-v${model.version}|startup-${replicate}`);
    const populations = Array(maxSteps + 1).fill(config.initialCount);
    for (let step = 0; step <= Math.min(STARTUP_PHYSICS_SAMPLES, maxSteps); step += 1) {
      populations[step] = startup.populations[Math.min(step, startup.populations.length - 1)];
    }
    let population = populations[Math.min(STARTUP_PHYSICS_SAMPLES, maxSteps)];
    let terminalPopulation = population;
    const terminalAfterStartup = startup.ended || population <= 1 || population >= trajectoryTarget;
    const predictedStartupLogSpeed = clamp(
      dot(model.regressions.speedLog, speedFeatures(config, config.initialCount, STARTUP_PHYSICS_SECONDS, model.horizonSeconds)),
      -1.2,
      1.2,
    );
    const observedStartupSpeed = startup.meanSpeeds[Math.min(STARTUP_PHYSICS_SAMPLES, startup.meanSpeeds.length - 1)];
    const speedAdjustment = observedStartupSpeed > 0
      ? observedStartupSpeed / (speedReference(config) * Math.exp(predictedStartupLogSpeed))
      : 1;
    const factor = Math.exp(clamp(normal(random) * model.rateNoiseSigma, -2, 2));
    for (let step = STARTUP_PHYSICS_SAMPLES + 1; step <= maxSteps && !terminalAfterStartup; step += 1) {
      const time = step * internalStep;
      const meanSpeed = speedReference(config) * speedAdjustment * Math.exp(clamp(dot(model.regressions.speedLog, speedFeatures(config, population, time, model.horizonSeconds)), -1.2, 1.2));
      const birthOpportunityCorrection = Math.exp(clamp(dot(model.regressions.birthOpportunityLog, collisionFeatures(config, population)), -5, 5));
      const baseCollisionRate = population * (population - 1) * ballDiameter(config) * Math.SQRT2 * meanSpeed / arenaArea(config);
      const spaceAvailability = logistic(dot(model.regressions.spaceLogit, spaceFeatures(config, population)));
      const exitRate = Math.exp(clamp(dot(model.regressions.exitLog, exitFeatures(config, population)), -20, 10));
      const birthRate = baseCollisionRate * birthOpportunityCorrection * factor * spaceAvailability;
      const births = poisson(birthRate * internalStep, random);
      const exits = poisson(exitRate * population * internalStep, random);
      population = clamp(population + births - exits, 0, trajectoryTarget);
      populations[step] = population;
      if (population <= 1 || population >= trajectoryTarget) {
        terminalPopulation = population;
        for (let remaining = step + 1; remaining <= maxSteps; remaining += 1) populations[remaining] = terminalPopulation;
        break;
      }
    }
    if (terminalAfterStartup) {
      for (let step = STARTUP_PHYSICS_SAMPLES + 1; step <= maxSteps; step += 1) populations[step] = terminalPopulation;
    }
    return Array.from({ length: expectedSampleCount }, (_, sample) => populations[Math.min(maxSteps, sample * sampleSteps)] ?? terminalPopulation);
  });
}

function quantilePrediction(paths: number[][], interval: number): GrowthPredictionPoint[] {
  const sampleCount = Math.max(...paths.map((path) => path.length));
  return Array.from({ length: sampleCount }, (_, index) => {
    const values = paths.map((path) => path[Math.min(index, path.length - 1)]).sort((first, second) => first - second);
    return { time: index * interval, p10: quantile(values, 0.1), p50: quantile(values, 0.5), p90: quantile(values, 0.9) };
  });
}

export function predictGrowth(
  config: SimulationConfig,
  model: GrowthModelArtifact | null | undefined,
  options: { replicates?: number; intervalSeconds?: number; seed?: string } = {},
): GrowthPredictionPoint[] {
  if (!model?.calibrated || model.regressions.birthOpportunityLog.length === 0) return [];
  const interval = Math.max(0.05, options.intervalSeconds ?? 0.5);
  const paths = simulateGrowthPaths(config, model, {
    replicates: Math.max(20, Math.floor(options.replicates ?? 240)),
    intervalSeconds: interval,
    seed: `${options.seed ?? config.seed}|growth-model-v${model.version}`,
  });
  return quantilePrediction(paths, interval);
}

export function validateGrowthPredictions(
  outcomes: Outcome[],
  model: GrowthModelArtifact,
): {
  t10To90MedianRelativeError: number | null;
  t10To90CompletionRateAbsoluteError: number | null;
  intervalCoverage80: number | null;
  configurationDiagnostics: GrowthModelArtifact['validation']['configurationDiagnostics'];
} {
  const groups = new Map<string, Outcome[]>();
  for (const outcome of outcomes) {
    if (outcome.status !== 'succeeded' || !outcome.result) continue;
    const key = configKey(outcome.config);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(outcome);
  }
  const relativeErrors: number[] = [];
  const completionRateErrors: number[] = [];
  const configurationDiagnostics: GrowthModelArtifact['validation']['configurationDiagnostics'] = [];
  let covered = 0;
  let total = 0;
  for (const group of groups.values()) {
    const config = group[0].config;
    const threshold10 = Math.max(config.initialCount + 1, Math.ceil(config.maxPopulation * 0.1));
    const threshold90 = Math.ceil(config.maxPopulation * 0.9);
    const sampleInterval = 0.05;
    const predictedPaths = simulateGrowthPaths(config, model, {
      replicates: 500,
      intervalSeconds: sampleInterval,
      seed: `validation-${configKey(config)}`,
    });
    const prediction = quantilePrediction(predictedPaths, sampleInterval);
    if (prediction.length === 0) continue;
    const observedThresholdTimes: number[] = [];
    let configurationCovered = 0;
    let configurationTotal = 0;
    for (const outcome of group) {
      const points = outcome.result!.timeSeries;
      const exactDuration = outcome.result!.metrics.t10To90Seconds;
      if (typeof exactDuration === 'number' && exactDuration > 0) {
        observedThresholdTimes.push(exactDuration);
      } else {
        const t10 = points.find((point) => point.population >= threshold10)?.time;
        const t90 = points.find((point) => point.population >= threshold90)?.time;
        if (t10 !== undefined && t90 !== undefined && t90 > t10) observedThresholdTimes.push(t90 - t10);
      }
      for (const point of points) {
        if (point.time > prediction.at(-1)!.time) continue;
        const expected = prediction[Math.min(prediction.length - 1, Math.round(point.time / sampleInterval))];
        if (!expected) continue;
        total += 1;
        configurationTotal += 1;
        if (point.population >= expected.p10 && point.population <= expected.p90) {
          covered += 1;
          configurationCovered += 1;
        }
      }
    }
    const predictedThresholdTimes = predictedPaths.flatMap((path) => {
      const t10 = path.findIndex((population) => population >= threshold10);
      const t90 = path.findIndex((population) => population >= threshold90);
      return t10 >= 0 && t90 > t10 ? [(t90 - t10) * sampleInterval] : [];
    });
    const observedCompletionRate = observedThresholdTimes.length / group.length;
    const predictedCompletionRate = predictedThresholdTimes.length / predictedPaths.length;
    const sortedObservedThresholdTimes = observedThresholdTimes.sort((first, second) => first - second);
    const sortedPredictedThresholdTimes = predictedThresholdTimes.sort((first, second) => first - second);
    completionRateErrors.push(Math.abs(predictedCompletionRate - observedCompletionRate));
    let configurationError: number | null = null;
    const observedMedian = sortedObservedThresholdTimes.length ? median(sortedObservedThresholdTimes) : null;
    const predictedMedian = sortedPredictedThresholdTimes.length ? median(sortedPredictedThresholdTimes) : null;
    if (observedMedian !== null && predictedMedian !== null) {
      configurationError = Math.abs(predictedMedian / observedMedian - 1);
      relativeErrors.push(configurationError);
    }
    configurationDiagnostics.push({
      key: configKey(config),
      observedCompletionRate,
      predictedCompletionRate,
      observedT10To90MedianSeconds: observedMedian,
      predictedT10To90MedianSeconds: predictedMedian,
      predictedT10To90P10Seconds: sortedPredictedThresholdTimes.length ? quantile(sortedPredictedThresholdTimes, 0.1) : null,
      predictedT10To90P90Seconds: sortedPredictedThresholdTimes.length ? quantile(sortedPredictedThresholdTimes, 0.9) : null,
      t10To90MedianRelativeError: configurationError,
      intervalCoverage80: configurationTotal ? configurationCovered / configurationTotal : null,
    });
  }
  const sortedErrors = relativeErrors.sort((first, second) => first - second);
  const sortedCompletionRateErrors = completionRateErrors.sort((first, second) => first - second);
  return {
    t10To90MedianRelativeError: sortedErrors.length ? median(sortedErrors) : null,
    intervalCoverage80: total ? covered / total : null,
    t10To90CompletionRateAbsoluteError: sortedCompletionRateErrors.length ? median(sortedCompletionRateErrors) : null,
    configurationDiagnostics,
  };
}
