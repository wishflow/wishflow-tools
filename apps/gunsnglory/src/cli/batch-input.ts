import {
  MAX_EXPERIMENT_BATCH_RUNS,
  type ExperimentBatchRequest,
  type ExperimentScenario,
} from '../experiments';
import { cowGulchContent } from '../content/cow-gulch';
import { GAME_RULES_VERSION } from '../game';

export interface SerialBatchInput {
  schemaVersion: 1;
  batchId: string;
  samples: readonly { id: string; randomSeed: number }[];
  budgets?: Partial<Pick<ExperimentScenario,
    'maxFrames' | 'maxSimulatedMs' | 'maxEntities' | 'maxWallClockMs' | 'yieldEveryFrames'>>;
}

export class SerialBatchInputError extends Error {
  readonly code = 'invalid-input' as const;

  constructor(message: string) {
    super(message);
    this.name = 'SerialBatchInputError';
  }
}

const DEFAULT_BUDGETS = Object.freeze({
  maxFrames: 2_000,
  maxSimulatedMs: 200_000,
  maxEntities: 100,
  maxWallClockMs: 30_000,
  yieldEveryFrames: 40,
});

const BUDGET_LIMITS: Readonly<Record<keyof typeof DEFAULT_BUDGETS, { min: number; max: number }>> = {
  maxFrames: { min: 1, max: 250_000 },
  maxSimulatedMs: { min: 0, max: 2_147_483_647 },
  maxEntities: { min: 1, max: 100_000 },
  maxWallClockMs: { min: 1, max: 120_000 },
  yieldEveryFrames: { min: 1, max: 10_000 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validId(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximumLength
    && value.trim() === value && value !== 'latest';
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function parseSerialBatchInput(value: unknown): ExperimentBatchRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['schemaVersion', 'batchId', 'samples', 'budgets'])
    || value.schemaVersion !== 1) {
    throw new SerialBatchInputError('Input must use schemaVersion 1 and contain only supported fields');
  }
  if (!validId(value.batchId, 64) || !Array.isArray(value.samples)
    || value.samples.length < 1 || value.samples.length > MAX_EXPERIMENT_BATCH_RUNS) {
    throw new SerialBatchInputError(`batchId is required and samples must contain 1–${MAX_EXPERIMENT_BATCH_RUNS} items`);
  }

  const sampleIds = new Set<string>();
  const samples: { id: string; randomSeed: number }[] = [];
  for (const sample of value.samples) {
    if (!isRecord(sample) || !hasOnlyKeys(sample, ['id', 'randomSeed'])
      || !validId(sample.id, 64) || !Number.isSafeInteger(sample.randomSeed)
      || (sample.randomSeed as number) < 0 || (sample.randomSeed as number) > 0xffff_ffff
      || sampleIds.has(sample.id)) {
      throw new SerialBatchInputError('Each sample needs a unique ID and an unsigned 32-bit randomSeed');
    }
    if (`${value.batchId}:${sample.id}`.length > 128) {
      throw new SerialBatchInputError('batchId and sample ID are too long for a stable run ID');
    }
    sampleIds.add(sample.id);
    samples.push({ id: sample.id, randomSeed: sample.randomSeed as number });
  }

  const budgets: Record<keyof typeof DEFAULT_BUDGETS, number> = { ...DEFAULT_BUDGETS };
  if (value.budgets !== undefined) {
    if (!isRecord(value.budgets) || !hasOnlyKeys(value.budgets, Object.keys(BUDGET_LIMITS))) {
      throw new SerialBatchInputError('budgets contains an unsupported field');
    }
    for (const [name, requested] of Object.entries(value.budgets)) {
      const key = name as keyof typeof DEFAULT_BUDGETS;
      const limits = BUDGET_LIMITS[key];
      if (!Number.isSafeInteger(requested) || (requested as number) < limits.min || (requested as number) > limits.max) {
        throw new SerialBatchInputError(`${name} must be an integer from ${limits.min} to ${limits.max}`);
      }
      budgets[key] = requested as number;
    }
  }

  const scenario: ExperimentScenario = {
    id: 'cow-gulch-single-wave',
    version: '1',
    gameScenarioId: cowGulchContent.id,
    contentVersion: cowGulchContent.contentVersion ?? 'unversioned',
    rulesVersion: GAME_RULES_VERSION,
    observationLevel: 'player-visible',
    decisionIntervalFrames: 1,
    deltaMs: 100,
    ...budgets,
  };
  return Object.freeze({
    batchId: value.batchId,
    scenario: Object.freeze(scenario),
    samples: Object.freeze(samples.map((sample) => Object.freeze(sample))),
    policy: Object.freeze({ id: 'start-wave', version: '1' }),
  });
}
