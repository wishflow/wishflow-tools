import {
  GameOpenError,
  type Game,
  type GameIntent,
  type GameSettlementRecord,
  type GameStartRecord,
  type GameView,
} from '../game';

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

export interface Experiments {
  run(request: RunRequest, options?: { signal?: AbortSignal }): Promise<RunResult>;
}

interface ExperimentsRuntime {
  now(): number;
  yieldToHost(): Promise<void>;
}

interface CreateExperimentsOptions {
  game: Game;
  policies: readonly ControlPolicy[];
  /** Override monotonic time and event-loop yielding in deterministic tests. */
  runtime?: Partial<ExperimentsRuntime>;
}

interface FrozenRunRequest {
  runId: string;
  scenario: ExperimentScenario;
  sample: { id: string; randomSeed: number };
  policy: { id: string; version: string };
}

const MAX_ID_LENGTH = 128;
const MAX_SCENARIO_FRAMES = 250_000;
const MAX_INTENTS_PER_DECISION = 16;
const MAX_RECORDED_ACTIONS = 10_000;

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

function snapshotRequest(value: unknown): FrozenRunRequest | undefined {
  if (!isRecord(value) || !isRecord(value.scenario) || !isRecord(value.sample) || !isRecord(value.policy)) {
    return undefined;
  }
  const scenario = value.scenario;
  const sample = value.sample;
  const policy = value.policy;
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
    yieldToHost: options.runtime?.yieldToHost ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0))),
  };

  return Object.freeze({
    async run(input: RunRequest, runOptions: { signal?: AbortSignal } = {}): Promise<RunResult> {
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
          });
        } catch (error) {
          if (error instanceof GameOpenError && error.code === 'scenario-unavailable') {
            return finish('invalid-input', 'scenario-unavailable', { error: { code: error.code, message: error.message } });
          }
          throw error;
        }

        startRecord = freezeDeep({ ...session.startRecord });
        view = session.observe();
        peakEntities = entityCount(view);
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
    },
  });
}
