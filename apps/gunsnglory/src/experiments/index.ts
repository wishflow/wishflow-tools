import {
  GameOpenError,
  type Game,
  type GameIntent,
  type GameSettlementRecord,
  type GameStartRecord,
  type GameView,
  type NumericParameterValue,
  type PreparedSetup,
} from '../game';
import { ExperimentRepositoryError, type ExperimentRepository, type ListSavedComparisonsRequest, type SavedComparison, type SavedComparisonPage } from './experiment-repository';
import { createMemoryExperimentRepository } from './memory-experiment-repository';
export type { ListSavedComparisonsRequest, SavedComparison, SavedComparisonPage, SavedComparisonSummary } from './experiment-repository';

export type RunStatus = 'completed' | 'cancelled' | 'budget-exceeded' | 'failed' | 'invalid-input';
export type RunOutcome = 'victory' | 'defeat';
export type RunStopReason =
  | RunOutcome
  | 'invalid-request'
  | 'policy-unavailable'
  | 'scenario-unavailable'
  | 'content-version-mismatch'
  | 'rules-version-mismatch'
  | 'policy-version-mismatch'
  | 'invalid-policy-output'
  | 'intent-rejected'
  | 'max-frames'
  | 'max-simulated-time'
  | 'max-entities'
  | 'max-wall-clock-time'
  | 'max-policy-actions'
  | 'prepared-setup-mismatch'
  | 'cancelled'
  | 'execution-error';

export interface ExperimentScenario {
  /** Stable identity of this experiment scenario, independent of the Game map ID. */
  id: string;
  version: string;
  gameScenarioId: string;
  contentVersion: string;
  rulesVersion: string;
  observationLevel: 'player-visible';
  decisionIntervalFrames: number;
  deltaMs: number;
  maxFrames: number;
  maxSimulatedMs: number;
  maxEntities: number;
  maxWallClockMs: number;
  yieldEveryFrames: number;
}

export interface RunRequest {
  runId: string;
  scenario: ExperimentScenario;
  sample: { id: string; randomSeed: number };
  policy: { id: string; version: string };
  preparedSetup?: PreparedSetup;
}

export interface StrategyObservation {
  frame: number;
  elapsedMs: number;
  units: readonly {
    id: string;
    type: string;
    selected: boolean;
    moving: boolean;
    upgradeLevel: number;
    positionFine: { x: number; y: number };
  }[];
  enemies: readonly {
    id: string;
    type: number;
    direction: string;
    positionFine: { x: number; y: number };
  }[];
  recruitPool: readonly { unitType: string; price: number; count: number }[];
  wave?: {
    number: number;
    phase: 'not-started' | 'active' | 'complete';
    lives: number;
    escapedEnemies: number;
    defeatedEnemies: number;
    cash: number;
    activeEnemies: number;
  };
}

export interface ControlPolicyInstance {
  decide(observation: StrategyObservation): readonly GameIntent[] | undefined;
}

/** Policy code is registered by stable ID/version; scenario data only references that ID. */
export interface ControlPolicy {
  id: string;
  version: string;
  create(): ControlPolicyInstance;
}

export interface RunActionRecord {
  observationFrame: number;
  /** The Game frame the accepted action was consumed in; absent when rejected or not advanced. */
  executionFrame?: number;
  accepted: boolean;
  intent: GameIntent;
}

export interface RunMetrics {
  frameCount: number;
  simulatedMs: number;
  wallClockMs?: number;
  peakEntities: number;
  peakActiveEnemies: number;
  initialCash?: number;
  livesRemaining?: number;
  escapedEnemies?: number;
  defeatedEnemies?: number;
  finalCash?: number;
}

export interface RunResult {
  runId?: string;
  scenarioId?: string;
  scenarioVersion?: string;
  sampleId?: string;
  policyId?: string;
  policyVersion?: string;
  status: RunStatus;
  stopReason: RunStopReason;
  outcome?: RunOutcome;
  startRecord?: Readonly<GameStartRecord>;
  settlement?: Readonly<GameSettlementRecord>;
  actions: readonly RunActionRecord[];
  metrics?: RunMetrics;
  error?: { code: string; message: string };
}

export interface NumericSchemeInput {
  id: string;
  version: string;
  scenarioId: string;
  overrides?: readonly NumericParameterValue[];
}

export interface NumericSchemeVersion {
  id: string;
  version: string;
  scenarioId: string;
  contentVersion: string;
  rulesVersion: string;
  preparedSetup: PreparedSetup;
}

export interface NumericSchemeReference {
  id: string;
  version: string;
}

export interface ExperimentComparisonRequest {
  comparisonId: string;
  scenario: ExperimentScenario;
  baseline: NumericSchemeReference;
  candidate: NumericSchemeReference;
  samples: readonly { id: string; randomSeed: number }[];
  policy: { id: string; version: string };
}

export interface ComparisonSideSummary {
  plannedSamples: number;
  completedSamples: number;
  incompleteSamples: number;
  incompleteRate: number;
  victories: number;
  defeats: number;
  winRate: number | null;
  averageLivesRemaining: number | null;
  averageVictoryTimeMs: number | null;
  averageFinalCash: number | null;
  averageCashDelta: number | null;
  averagePeakEnemies: number | null;
  averageEscapedEnemies: number | null;
}

export interface ComparisonPair {
  sample: { id: string; randomSeed: number };
  baseline?: RunResult;
  candidate?: RunResult;
}

export interface ComparisonVariant {
  scheme: NumericSchemeVersion;
  runs: readonly RunResult[];
  summary: ComparisonSideSummary;
}

export interface ExperimentComparisonReport {
  comparisonId: string;
  request: ExperimentComparisonRequest;
  status: 'completed' | 'cancelled';
  scenarioId: string;
  scenarioVersion: string;
  gameScenarioId: string;
  contentVersion: string;
  rulesVersion: string;
  policyId: string;
  policyVersion: string;
  plannedSampleCount: number;
  plannedRunCount: number;
  completedRunCount: number;
  incompleteRunCount: number;
  incompleteRate: number;
  pairedCompletedSampleCount: number;
  baseline: ComparisonVariant;
  candidate: ComparisonVariant;
  pairs: readonly ComparisonPair[];
}

export interface Experiments {
  run(request: RunRequest, options?: { signal?: AbortSignal }): Promise<RunResult>;
  saveScheme(input: NumericSchemeInput): Promise<NumericSchemeVersion>;
  compare(input: ExperimentComparisonRequest, options?: { signal?: AbortSignal }): Promise<ExperimentComparisonReport>;
  saveComparison(report: ExperimentComparisonReport): Promise<SavedComparison>;
  openComparison(id: string): Promise<SavedComparison | null>;
  listComparisons(request?: ListSavedComparisonsRequest): Promise<SavedComparisonPage>;
}

interface ExperimentsRuntime {
  now(): number;
  timestamp(): number;
  yieldToHost(): Promise<void>;
}

interface CreateExperimentsOptions {
  game: Game;
  policies: readonly ControlPolicy[];
  repository?: ExperimentRepository;
  /** Override monotonic time, saved timestamps, and event-loop yielding in deterministic tests. */
  runtime?: Partial<ExperimentsRuntime>;
}

interface FrozenRunRequest {
  runId: string;
  scenario: ExperimentScenario;
  sample: { id: string; randomSeed: number };
  policy: { id: string; version: string };
  preparedSetup?: PreparedSetup;
}

interface FrozenComparisonRequest extends ExperimentComparisonRequest {
  scenario: ExperimentScenario;
  baseline: NumericSchemeReference;
  candidate: NumericSchemeReference;
  samples: readonly { id: string; randomSeed: number }[];
  policy: { id: string; version: string };
}

const MAX_ID_LENGTH = 128;
const MAX_SCENARIO_FRAMES = 250_000;
const MAX_INTENTS_PER_DECISION = 16;
const MAX_RECORDED_ACTIONS = 10_000;
const MAX_COMPARISON_SAMPLES = 25;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH
    && value.trim() === value && value !== 'latest';
}

function validInteger(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

function snapshotPreparedSetup(value: unknown): PreparedSetup | undefined {
  if (!isRecord(value) || !validId(value.scenarioId) || !validId(value.contentVersion)
    || !validId(value.rulesVersion) || typeof value.digest !== 'string'
    || !/^sha256:[a-f0-9]{64}$/.test(value.digest) || !Array.isArray(value.parameters)) {
    return undefined;
  }
  const paths = new Set<string>();
  const parameters: NumericParameterValue[] = [];
  for (const entry of value.parameters) {
    if (!isRecord(entry) || typeof entry.path !== 'string' || !entry.path
      || entry.path.length > MAX_ID_LENGTH || !validInteger(entry.value, 0, 1_000_000_000)
      || paths.has(entry.path)) return undefined;
    paths.add(entry.path);
    parameters.push({ path: entry.path, value: entry.value });
  }
  return freezeDeep({
    scenarioId: value.scenarioId,
    contentVersion: value.contentVersion,
    rulesVersion: value.rulesVersion,
    parameters,
    digest: value.digest,
  });
}

function snapshotOverrides(value: unknown): NumericParameterValue[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return undefined;
  const paths = new Set<string>();
  const overrides: NumericParameterValue[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.path !== 'string' || !entry.path
      || entry.path.length > MAX_ID_LENGTH || !validInteger(entry.value, 0, 1_000_000_000)
      || paths.has(entry.path)) return undefined;
    paths.add(entry.path);
    overrides.push({ path: entry.path, value: entry.value });
  }
  return overrides;
}

function snapshotComparison(value: unknown): FrozenComparisonRequest | undefined {
  if (!isRecord(value) || !validId(value.comparisonId) || value.comparisonId.length > 100
    || !isRecord(value.baseline) || !isRecord(value.candidate) || !Array.isArray(value.samples)
    || value.samples.length < 1 || value.samples.length > MAX_COMPARISON_SAMPLES) {
    return undefined;
  }
  const baseline = value.baseline;
  const candidate = value.candidate;
  if (!validId(baseline.id) || !validId(baseline.version)
    || !validId(candidate.id) || !validId(candidate.version)
    || (baseline.id === candidate.id && baseline.version === candidate.version)) return undefined;

  const samples: { id: string; randomSeed: number }[] = [];
  const sampleIds = new Set<string>();
  const seeds = new Set<number>();
  for (const sample of value.samples) {
    if (!isRecord(sample) || !validId(sample.id) || !validInteger(sample.randomSeed, 0, 0xffff_ffff)
      || sampleIds.has(sample.id) || seeds.has(sample.randomSeed)) return undefined;
    sampleIds.add(sample.id);
    seeds.add(sample.randomSeed);
    samples.push({ id: sample.id, randomSeed: sample.randomSeed });
  }

  const template = snapshotRequest({
    runId: value.comparisonId + ':0:baseline',
    scenario: value.scenario,
    sample: samples[0],
    policy: value.policy,
  });
  if (!template) return undefined;
  return freezeDeep({
    comparisonId: value.comparisonId,
    scenario: template.scenario,
    baseline: { id: baseline.id, version: baseline.version },
    candidate: { id: candidate.id, version: candidate.version },
    samples,
    policy: template.policy,
  });
}

function schemeKey(id: string, version: string): string {
  return JSON.stringify([id, version]);
}

function average(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function summarizeRuns(runs: readonly RunResult[], plannedSamples: number): ComparisonSideSummary {
  const completed = runs.filter((run) => run.status === 'completed');
  const victories = completed.filter((run) => run.outcome === 'victory');
  const defeats = completed.filter((run) => run.outcome === 'defeat');
  const metrics = completed.flatMap((run) => run.metrics ? [run.metrics] : []);
  const cashPairs = metrics.flatMap((metric) =>
    metric.initialCash !== undefined && metric.finalCash !== undefined
      ? [metric.finalCash - metric.initialCash]
      : []);

  return {
    plannedSamples,
    completedSamples: completed.length,
    incompleteSamples: Math.max(0, plannedSamples - completed.length),
    incompleteRate: plannedSamples ? Math.max(0, plannedSamples - completed.length) / plannedSamples : 0,
    victories: victories.length,
    defeats: defeats.length,
    winRate: completed.length ? victories.length / completed.length : null,
    averageLivesRemaining: average(metrics.flatMap((metric) =>
      metric.livesRemaining === undefined ? [] : [metric.livesRemaining])),
    averageVictoryTimeMs: average(victories.flatMap((run) =>
      run.metrics ? [run.metrics.simulatedMs] : [])),
    averageFinalCash: average(metrics.flatMap((metric) =>
      metric.finalCash === undefined ? [] : [metric.finalCash])),
    averageCashDelta: average(cashPairs),
    averagePeakEnemies: average(metrics.map((metric) => metric.peakActiveEnemies)),
    averageEscapedEnemies: average(metrics.flatMap((metric) =>
      metric.escapedEnemies === undefined ? [] : [metric.escapedEnemies])),
  };
}

function snapshotRequest(value: unknown): FrozenRunRequest | undefined {
  if (!isRecord(value) || !isRecord(value.scenario) || !isRecord(value.sample) || !isRecord(value.policy)) {
    return undefined;
  }
  const scenario = value.scenario;
  const sample = value.sample;
  const policy = value.policy;
  const preparedSetup = value.preparedSetup === undefined ? undefined : snapshotPreparedSetup(value.preparedSetup);
  if (value.preparedSetup !== undefined && !preparedSetup) return undefined;
  if (preparedSetup && (preparedSetup.scenarioId !== scenario.gameScenarioId
    || preparedSetup.contentVersion !== scenario.contentVersion
    || preparedSetup.rulesVersion !== scenario.rulesVersion)) return undefined;
  if (!validId(value.runId) || !validId(scenario.id) || !validId(scenario.version)
    || !validId(scenario.gameScenarioId) || !validId(scenario.contentVersion)
    || !validId(scenario.rulesVersion) || scenario.observationLevel !== 'player-visible'
    || !validInteger(scenario.decisionIntervalFrames, 1, MAX_SCENARIO_FRAMES)
    || !validInteger(scenario.deltaMs, 0, 100)
    || !validInteger(scenario.maxFrames, 1, MAX_SCENARIO_FRAMES)
    || !validInteger(scenario.maxSimulatedMs, 0, 2_147_483_647)
    || !validInteger(scenario.maxEntities, 1, 100_000)
    || !validInteger(scenario.maxWallClockMs, 1, 120_000)
    || !validInteger(scenario.yieldEveryFrames, 1, 10_000)
    || !validId(sample.id) || !validInteger(sample.randomSeed, 0, 0xffff_ffff)
    || !validId(policy.id) || !validId(policy.version)) {
    return undefined;
  }

  return freezeDeep({
    runId: value.runId,
    scenario: {
      id: scenario.id,
      version: scenario.version,
      gameScenarioId: scenario.gameScenarioId,
      contentVersion: scenario.contentVersion,
      rulesVersion: scenario.rulesVersion,
      observationLevel: 'player-visible',
      decisionIntervalFrames: scenario.decisionIntervalFrames,
      deltaMs: scenario.deltaMs,
      maxFrames: scenario.maxFrames,
      maxSimulatedMs: scenario.maxSimulatedMs,
      maxEntities: scenario.maxEntities,
      maxWallClockMs: scenario.maxWallClockMs,
      yieldEveryFrames: scenario.yieldEveryFrames,
    },
    sample: { id: sample.id, randomSeed: sample.randomSeed },
    policy: { id: policy.id, version: policy.version },
    ...(preparedSetup ? { preparedSetup } : {}),
  });
}

function safeIdentity(value: unknown): Pick<RunResult, 'runId' | 'scenarioId' | 'scenarioVersion' | 'sampleId' | 'policyId' | 'policyVersion'> {
  if (!isRecord(value)) return {};
  const scenario = isRecord(value.scenario) ? value.scenario : {};
  const sample = isRecord(value.sample) ? value.sample : {};
  const policy = isRecord(value.policy) ? value.policy : {};
  return {
    ...(typeof value.runId === 'string' ? { runId: value.runId } : {}),
    ...(typeof scenario.id === 'string' ? { scenarioId: scenario.id } : {}),
    ...(typeof scenario.version === 'string' ? { scenarioVersion: scenario.version } : {}),
    ...(typeof sample.id === 'string' ? { sampleId: sample.id } : {}),
    ...(typeof policy.id === 'string' ? { policyId: policy.id } : {}),
    ...(typeof policy.version === 'string' ? { policyVersion: policy.version } : {}),
  };
}

function copyIntent(value: unknown): GameIntent | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined;
  const keys = Object.keys(value).sort().join(',');
  switch (value.type) {
    case 'clear-selection':
    case 'start-wave':
    case 'stop-moving':
      return keys === 'type' ? { type: value.type } : undefined;
    case 'select-at':
      return keys === 'type,x,y' && Number.isFinite(value.x) && Number.isFinite(value.y)
        ? { type: 'select-at', x: value.x as number, y: value.y as number }
        : undefined;
    case 'move-unit':
      return keys === 'targetX,targetY,type' && Number.isFinite(value.targetX) && Number.isFinite(value.targetY)
        ? { type: 'move-unit', targetX: value.targetX as number, targetY: value.targetY as number }
        : undefined;
    case 'recruit-unit':
      return keys === 'commandId,type,unitType' && validId(value.commandId) && validId(value.unitType)
        ? { type: 'recruit-unit', unitType: value.unitType, commandId: value.commandId }
        : undefined;
    case 'upgrade-unit':
      return keys === 'commandId,type,unitId' && validId(value.commandId) && validId(value.unitId)
        ? { type: 'upgrade-unit', unitId: value.unitId, commandId: value.commandId }
        : undefined;
    default:
      return undefined;
  }
}

function playerObservation(view: GameView): StrategyObservation {
  return freezeDeep({
    frame: view.frame,
    elapsedMs: view.elapsedMs,
    units: view.units.map(({ id, type, selected, moving, upgradeLevel, positionFine }) => ({
      id,
      type,
      selected,
      moving,
      upgradeLevel,
      positionFine: { x: positionFine.x, y: positionFine.y },
    })),
    enemies: view.enemies.filter(({ alive }) => alive).map(({ id, type, direction, positionFine }) => ({
      id,
      type,
      direction,
      positionFine: { x: positionFine.x, y: positionFine.y },
    })),
    recruitPool: view.recruitPool.map(({ unitType, price, count }) => ({ unitType, price, count })),
    ...(view.wave ? {
      wave: {
        number: view.wave.number,
        phase: view.wave.phase,
        lives: view.wave.lives,
        escapedEnemies: view.wave.escapedEnemies,
        defeatedEnemies: view.wave.defeatedEnemies,
        cash: view.wave.cash,
        activeEnemies: view.wave.activeEnemies,
      },
    } : {}),
  });
}

function entityCount(view: GameView): number {
  return view.units.length + view.enemies.length + view.shots.length
    + view.recruitPool.reduce((total, entry) => total + entry.count, 0);
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 512);
}

export function createExperiments(options: CreateExperimentsOptions): Experiments {
  const policies = new Map<string, { version: string; create: ControlPolicy['create'] }>();
  for (const policy of options.policies) {
    if (!validId(policy.id) || !validId(policy.version) || typeof policy.create !== 'function') {
      throw new TypeError('Control policy registration is invalid');
    }
    if (policies.has(policy.id)) throw new TypeError(`Duplicate control policy ID: ${policy.id}`);
    const create = policy.create;
    policies.set(policy.id, { version: policy.version, create: () => create.call(policy) });
  }

  const runtime: ExperimentsRuntime = {
    now: options.runtime?.now ?? (() => performance.now()),
    timestamp: options.runtime?.timestamp ?? (() => Date.now()),
    yieldToHost: options.runtime?.yieldToHost ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0))),
  };
  const schemes = new Map<string, NumericSchemeVersion>();
  const repository = options.repository ?? createMemoryExperimentRepository();

  const runSingle: Experiments['run'] = async (input, runOptions = {}) => {
      const request = snapshotRequest(input);
      if (!request) {
        return freezeDeep({ ...safeIdentity(input), status: 'invalid-input', stopReason: 'invalid-request', actions: [] });
      }
      const identity = safeIdentity(request);
      const finishWithoutSession = (status: RunStatus, stopReason: RunStopReason, message?: string): RunResult =>
        freezeDeep({
          ...identity,
          status,
          stopReason,
          actions: [],
          ...(message ? { error: { code: stopReason, message } } : {}),
        });

      let startedAt: number;
      try {
        startedAt = runtime.now();
      } catch (error) {
        return finishWithoutSession('failed', 'execution-error', errorMessage(error));
      }
      if (!Number.isFinite(startedAt)) return finishWithoutSession('failed', 'execution-error', 'Runtime clock returned an invalid value');
      let lastClockRead = startedAt;
      const elapsedWallClock = (): number => {
        const now = runtime.now();
        if (!Number.isFinite(now) || now < lastClockRead) {
          throw new Error('Runtime clock returned an invalid or non-monotonic value');
        }
        lastClockRead = now;
        return now - startedAt;
      };
      if (runOptions.signal?.aborted) return finishWithoutSession('cancelled', 'cancelled');
      const registeredPolicy = policies.get(request.policy.id);
      if (!registeredPolicy) return finishWithoutSession('invalid-input', 'policy-unavailable');
      if (registeredPolicy.version !== request.policy.version) {
        return finishWithoutSession('invalid-input', 'policy-version-mismatch');
      }

      let policy: ControlPolicyInstance;
      try {
        policy = registeredPolicy.create();
        if (elapsedWallClock() >= request.scenario.maxWallClockMs) {
          return finishWithoutSession('budget-exceeded', 'max-wall-clock-time');
        }
      } catch (error) {
        return finishWithoutSession('failed', 'execution-error', errorMessage(error));
      }

      let session: Awaited<ReturnType<Game['open']>> | undefined;
      let startRecord: Readonly<GameStartRecord> | undefined;
      let view: GameView | undefined;
      let peakEntities = 0;
      let peakActiveEnemies = 0;
      let initialCash: number | undefined;
      const actions: RunActionRecord[] = [];
      const finish = (
        status: RunStatus,
        stopReason: RunStopReason,
        details: { outcome?: RunOutcome; settlement?: GameSettlementRecord; error?: { code: string; message: string } } = {},
      ): RunResult => {
        let wallClockMs: number | undefined;
        try {
          const finishedAt = runtime.now();
          if (Number.isFinite(finishedAt) && finishedAt >= lastClockRead) {
            wallClockMs = Math.max(0, finishedAt - startedAt);
            lastClockRead = finishedAt;
          }
        } catch {
          // Preserve the primary run result if the timing adapter itself has failed.
        }
        const metrics = view ? {
          frameCount: view.frame,
          simulatedMs: view.elapsedMs,
          ...(wallClockMs === undefined ? {} : { wallClockMs }),
          peakEntities,
          peakActiveEnemies,
          ...(initialCash === undefined ? {} : { initialCash }),
          ...(view.wave ? {
            livesRemaining: view.wave.lives,
            escapedEnemies: view.wave.escapedEnemies,
            defeatedEnemies: view.wave.defeatedEnemies,
            finalCash: view.wave.cash,
          } : {}),
        } : undefined;
        return freezeDeep({
          ...identity,
          status,
          stopReason,
          ...(details.outcome ? { outcome: details.outcome } : {}),
          ...(startRecord ? { startRecord } : {}),
          ...(details.settlement ? { settlement: { ...details.settlement } } : {}),
          actions: actions.map((action) => ({ ...action, intent: { ...action.intent } })),
          ...(metrics ? { metrics } : {}),
          ...(details.error ? { error: details.error } : {}),
        });
      };

      try {
        try {
          session = await options.game.open({
            scenarioId: request.scenario.gameScenarioId,
            randomSeed: request.sample.randomSeed,
            mode: 'experiment',
            ...(request.preparedSetup ? { preparedSetup: request.preparedSetup } : {}),
          });
        } catch (error) {
          if (error instanceof GameOpenError && error.code === 'scenario-unavailable') {
            return finish('invalid-input', 'scenario-unavailable', { error: { code: error.code, message: error.message } });
          }
          if (error instanceof GameOpenError
            && (error.code === 'prepared-setup-invalid' || error.code === 'prepared-setup-mismatch')) {
            return finish('invalid-input', 'prepared-setup-mismatch', { error: { code: error.code, message: error.message } });
          }
          throw error;
        }

        startRecord = freezeDeep({ ...session.startRecord });
        view = session.observe();
        peakEntities = entityCount(view);
        peakActiveEnemies = view.wave?.activeEnemies ?? 0;
        initialCash = view.wave?.cash;
        if (view.frame !== 0 || view.elapsedMs !== 0) {
          return finish('failed', 'execution-error', { error: { code: 'initial-state-advanced', message: 'Game advanced before the first experiment frame' } });
        }
        if (startRecord.scenarioId !== request.scenario.gameScenarioId) {
          return finish('failed', 'execution-error', { error: { code: 'start-record-mismatch', message: 'Game opened a different scenario than requested' } });
        }
        if (startRecord.contentVersion !== request.scenario.contentVersion) {
          return finish('invalid-input', 'content-version-mismatch');
        }
        if (startRecord.rulesVersion !== request.scenario.rulesVersion) {
          return finish('invalid-input', 'rules-version-mismatch');
        }
        if (startRecord.randomSeed !== request.sample.randomSeed || startRecord.mode !== 'experiment') {
          return finish('failed', 'execution-error', { error: { code: 'start-record-mismatch', message: 'Game did not honor the requested seed or experiment mode' } });
        }
        if (request.preparedSetup && startRecord.preparedSetup?.digest !== request.preparedSetup.digest) {
          return finish('invalid-input', 'prepared-setup-mismatch');
        }

        let framesSinceYield = 0;

        while (true) {
          if (runOptions.signal?.aborted) return finish('cancelled', 'cancelled');
          if (elapsedWallClock() >= request.scenario.maxWallClockMs) {
            return finish('budget-exceeded', 'max-wall-clock-time');
          }
          if (peakEntities > request.scenario.maxEntities) return finish('budget-exceeded', 'max-entities');
          if (view.frame >= request.scenario.maxFrames) return finish('budget-exceeded', 'max-frames');
          if (view.elapsedMs + request.scenario.deltaMs > request.scenario.maxSimulatedMs) {
            return finish('budget-exceeded', 'max-simulated-time');
          }

          const dueForDecision = view.frame % request.scenario.decisionIntervalFrames === 0;
          const scheduledActions: RunActionRecord[] = [];
          if (dueForDecision) {
            let proposed: readonly GameIntent[] | undefined;
            try {
              proposed = policy.decide(playerObservation(view));
            } catch (error) {
              return finish('failed', 'execution-error', { error: { code: 'policy-execution-error', message: errorMessage(error) } });
            }
            if (proposed !== undefined && !Array.isArray(proposed)) {
              return finish('invalid-input', 'invalid-policy-output');
            }
            if ((proposed?.length ?? 0) > MAX_INTENTS_PER_DECISION) {
              return finish('invalid-input', 'invalid-policy-output');
            }
            for (const item of proposed ?? []) {
              if (actions.length >= MAX_RECORDED_ACTIONS) return finish('budget-exceeded', 'max-policy-actions');
              const intent = copyIntent(item);
              if (!intent) return finish('invalid-input', 'invalid-policy-output');
              const accepted = session.submitIntent(intent);
              const action: RunActionRecord = {
                observationFrame: view.frame,
                accepted,
                intent,
              };
              actions.push(action);
              if (!accepted) return finish('invalid-input', 'intent-rejected');
              scheduledActions.push(action);
            }
          }

          const previousFrame: number = view.frame;
          const previousElapsedMs: number = view.elapsedMs;
          view = session.advance({ deltaMs: request.scenario.deltaMs });
          if (view.frame !== previousFrame + 1 || view.elapsedMs !== previousElapsedMs + request.scenario.deltaMs) {
            return finish('failed', 'execution-error', { error: { code: 'advance-contract-violation', message: 'Game did not consume exactly one requested frame and time input' } });
          }
          for (const action of scheduledActions) action.executionFrame = view.frame;
          framesSinceYield += 1;
          const currentEntityCount = entityCount(view);
          peakEntities = Math.max(peakEntities, currentEntityCount);
          peakActiveEnemies = Math.max(peakActiveEnemies, view.wave?.activeEnemies ?? 0);
          const settlement = session.terminalRecord();
          if (settlement) {
            if (settlement.mode !== 'experiment') {
              return finish('failed', 'execution-error', { error: { code: 'settlement-mode-mismatch', message: 'Experiment settlement was not marked as experiment mode' } });
            }
            return finish('completed', settlement.outcome, { outcome: settlement.outcome, settlement });
          }
          if (currentEntityCount > request.scenario.maxEntities) return finish('budget-exceeded', 'max-entities');

          if (framesSinceYield >= request.scenario.yieldEveryFrames) {
            framesSinceYield = 0;
            await runtime.yieldToHost();
          }
        }
      } catch (error) {
        return finish('failed', 'execution-error', { error: { code: 'execution-error', message: errorMessage(error) } });
      } finally {
        session?.close();
      }
    };

  const saveScheme: Experiments['saveScheme'] = async (input) => {
    if (!input || !validId(input.id) || !validId(input.version) || !validId(input.scenarioId)) {
      throw new TypeError('Numeric scheme identity is invalid');
    }
    const overrides = snapshotOverrides(input.overrides);
    if (!overrides) throw new TypeError('Numeric scheme overrides are invalid');
    const preparedSetup = await options.game.prepare({
      scenarioId: input.scenarioId,
      overrides,
    });
    if (preparedSetup.contentVersion === 'unversioned') {
      throw new TypeError('Numeric schemes require an exact content version');
    }
    const copiedSetup = snapshotPreparedSetup(preparedSetup);
    if (!copiedSetup) throw new TypeError('Game returned an invalid prepared setup');
    const scheme = freezeDeep({
      id: input.id,
      version: input.version,
      scenarioId: copiedSetup.scenarioId,
      contentVersion: copiedSetup.contentVersion,
      rulesVersion: copiedSetup.rulesVersion,
      preparedSetup: copiedSetup,
    });
    const key = schemeKey(scheme.id, scheme.version);
    const existing = schemes.get(key);
    if (existing) {
      if (existing.preparedSetup.digest === scheme.preparedSetup.digest) return existing;
      throw new TypeError('A numeric scheme version is immutable and already exists');
    }
    let persisted: NumericSchemeVersion;
    try {
      persisted = await repository.saveScheme(scheme);
    } catch (error) {
      if (error instanceof ExperimentRepositoryError && error.code === 'conflict') {
        throw new TypeError('A numeric scheme version is immutable and already exists');
      }
      throw error;
    }
    schemes.set(key, persisted);
    return persisted;
  };

  const compare: Experiments['compare'] = async (input, compareOptions = {}) => {
    const request = snapshotComparison(input);
    if (!request) throw new TypeError('Experiment comparison request is invalid');
    const loadScheme = async (reference: NumericSchemeReference) => {
      const key = schemeKey(reference.id, reference.version);
      const cached = schemes.get(key);
      if (cached) return cached;
      const stored = await repository.readScheme(reference);
      if (stored) schemes.set(key, freezeDeep(stored));
      return stored ?? undefined;
    };
    const baseline = await loadScheme(request.baseline);
    const candidate = await loadScheme(request.candidate);
    if (!baseline || !candidate) throw new RangeError('A referenced numeric scheme version is unavailable');
    for (const scheme of [baseline, candidate]) {
      if (scheme.scenarioId !== request.scenario.gameScenarioId
        || scheme.contentVersion !== request.scenario.contentVersion
        || scheme.rulesVersion !== request.scenario.rulesVersion) {
        throw new TypeError('Numeric scheme and comparison scenario versions do not match');
      }
    }

    const baselineRuns: RunResult[] = [];
    const candidateRuns: RunResult[] = [];
    const pairs: ComparisonPair[] = [];
    for (const [index, sample] of request.samples.entries()) {
      if (compareOptions.signal?.aborted) break;
      const baselineRun = await runSingle({
        runId: request.comparisonId + ':' + index + ':baseline',
        scenario: request.scenario,
        sample,
        policy: request.policy,
        preparedSetup: baseline.preparedSetup,
      }, { signal: compareOptions.signal });
      baselineRuns.push(baselineRun);

      let candidateRun: RunResult | undefined;
      if (!compareOptions.signal?.aborted && baselineRun.status !== 'cancelled') {
        candidateRun = await runSingle({
          runId: request.comparisonId + ':' + index + ':candidate',
          scenario: request.scenario,
          sample,
          policy: request.policy,
          preparedSetup: candidate.preparedSetup,
        }, { signal: compareOptions.signal });
        candidateRuns.push(candidateRun);
      }
      pairs.push({
        sample: { ...sample },
        baseline: baselineRun,
        ...(candidateRun ? { candidate: candidateRun } : {}),
      });
      if (compareOptions.signal?.aborted) break;
    }

    const plannedSamples = request.samples.length;
    const plannedRunCount = plannedSamples * 2;
    const completedRunCount = [...baselineRuns, ...candidateRuns]
      .filter((run) => run.status === 'completed').length;
    const incompleteRunCount = plannedRunCount - completedRunCount;
    return freezeDeep({
      comparisonId: request.comparisonId,
      request,
      status: compareOptions.signal?.aborted ? 'cancelled' : 'completed',
      scenarioId: request.scenario.id,
      scenarioVersion: request.scenario.version,
      gameScenarioId: request.scenario.gameScenarioId,
      contentVersion: request.scenario.contentVersion,
      rulesVersion: request.scenario.rulesVersion,
      policyId: request.policy.id,
      policyVersion: request.policy.version,
      plannedSampleCount: plannedSamples,
      plannedRunCount,
      completedRunCount,
      incompleteRunCount,
      incompleteRate: incompleteRunCount / plannedRunCount,
      pairedCompletedSampleCount: pairs.filter((pair) =>
        pair.baseline?.status === 'completed' && pair.candidate?.status === 'completed').length,
      baseline: {
        scheme: baseline,
        runs: baselineRuns,
        summary: summarizeRuns(baselineRuns, plannedSamples),
      },
      candidate: {
        scheme: candidate,
        runs: candidateRuns,
        summary: summarizeRuns(candidateRuns, plannedSamples),
      },
      pairs,
    });
  };

  const saveComparison: Experiments['saveComparison'] = async (report) => {
    const savedAt = runtime.timestamp();
    if (!Number.isSafeInteger(savedAt) || savedAt < 0) throw new TypeError('Saved timestamp is invalid');
    const input = {
      id: report.comparisonId,
      savedAt,
      request: report.request,
      summary: {
        status: report.status,
        scenarioId: report.scenarioId,
        scenarioVersion: report.scenarioVersion,
        candidateScheme: { id: report.request.candidate.id, version: report.request.candidate.version },
        plannedSampleCount: report.plannedSampleCount,
        completedRunCount: report.completedRunCount,
      },
      report,
    };
    return freezeDeep(await repository.saveComparison(input));
  };
  const openComparison: Experiments['openComparison'] = async (id) => {
    const saved = await repository.openComparison(id);
    return saved ? freezeDeep(saved) : null;
  };
  const listComparisons: Experiments['listComparisons'] = async (request) =>
    freezeDeep(await repository.listComparisons(request));

  return Object.freeze({ run: runSingle, saveScheme, compare, saveComparison, openComparison, listComparisons });
}
