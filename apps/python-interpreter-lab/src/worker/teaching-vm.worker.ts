import { compileTeachingSource } from '../teaching-vm/compiler';
import {
  DEFAULT_TEACHING_RUN_SPEED,
  getTeachingRunPace,
  normalizeTeachingRunSpeed,
  TEACHING_RUN_PACES,
  type TeachingRunSpeed,
} from '../teaching-vm/resource-limits';
import {
  createTeachingSourceStepGoal,
  isTeachingSourceStepGoalReached,
  type TeachingSourceStepGoal,
} from '../teaching-vm/source-step';
import {
  createTeachingMachine,
  getTeachingHistory,
  setTeachingMachineStatus,
  stepTeachingMachine,
  type TeachingMachine,
} from '../teaching-vm/vm';
import {
  TeachingDiagnostic,
  type TeachingCompileResult,
  type TeachingDiagnosticSnapshot,
} from '../teaching-vm/types';
import {
  sameTeachingWorkerIdentity,
  type TeachingHistoryUpdate,
  type TeachingWorkerIdentity,
  type TeachingWorkerRequest,
  type TeachingWorkerResponse,
} from '../teaching-vm/worker-protocol';

const workerScope = self as DedicatedWorkerGlobalScope;
let activeIdentity: TeachingWorkerIdentity | null = null;
let program: TeachingCompileResult | null = null;
let machine: TeachingMachine | null = null;
let runGeneration = 0;
let isRunning = false;
let activeRunCommand: 'run' | 'step-source' | null = null;
let pauseRequested = false;
let teachingRunSpeed: TeachingRunSpeed = DEFAULT_TEACHING_RUN_SPEED;
let cancelPendingRunDelay: (() => void) | null = null;
let lastPublishedStepIndex = -1;
let breakpointSourceLines: number[] = [];
let breakpointInstructionIndexes: number[] = [];

function respond(message: TeachingWorkerResponse): void {
  workerScope.postMessage(message);
}

function identityOf(request: TeachingWorkerIdentity): TeachingWorkerIdentity {
  return { sessionId: request.sessionId, sourceRevision: request.sourceRevision };
}

function identityMatches(identity: TeachingWorkerIdentity): boolean {
  return activeIdentity !== null && sameTeachingWorkerIdentity(activeIdentity, identity);
}

function replaceHistory(): TeachingHistoryUpdate {
  if (!machine) return { kind: 'replace', history: { items: [], truncated: false } };
  const history = getTeachingHistory(machine);
  lastPublishedStepIndex = history.items.at(-1)?.stepIndex ?? -1;
  return { kind: 'replace', history };
}

function updateHistory(): TeachingHistoryUpdate {
  if (!machine) return { kind: 'append', items: [], truncated: false };
  const history = getTeachingHistory(machine);
  const newItems = history.items.filter((item) => item.stepIndex > lastPublishedStepIndex);
  if (newItems.length > 0) {
    lastPublishedStepIndex = newItems[newItems.length - 1]?.stepIndex ?? lastPublishedStepIndex;
    return { kind: 'append', items: newItems, truncated: history.truncated };
  }

  const latest = history.items.at(-1);
  if (latest) return { kind: 'replace-last', snapshot: latest, truncated: history.truncated };
  return { kind: 'append', items: [], truncated: history.truncated };
}

function advanceIdentity(identity: TeachingWorkerIdentity): boolean {
  if (activeIdentity) {
    if (identity.sessionId < activeIdentity.sessionId) return false;
    if (identity.sessionId === activeIdentity.sessionId && identity.sourceRevision < activeIdentity.sourceRevision) return false;
  }

  if (!activeIdentity || !sameTeachingWorkerIdentity(activeIdentity, identity)) {
    cancelRun();
    activeIdentity = { ...identity };
    program = null;
    machine = null;
    breakpointSourceLines = [];
    breakpointInstructionIndexes = [];
    lastPublishedStepIndex = -1;
  }
  return true;
}

function cancelRun(): void {
  wakePendingRunDelay();
  runGeneration += 1;
  isRunning = false;
  activeRunCommand = null;
  pauseRequested = false;
}

function snapshotDiagnostic(error: unknown, fallbackStage: TeachingDiagnostic['stage']): TeachingDiagnosticSnapshot {
  if (error instanceof TeachingDiagnostic) {
    return {
      stage: error.stage,
      code: error.code,
      message: error.message,
      span: error.span,
    };
  }
  return {
    stage: fallbackStage,
    code: 'worker-error',
    message: error instanceof Error ? error.message : String(error),
    span: { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 },
  };
}

function sendError(identity: TeachingWorkerIdentity, error: unknown, stage: TeachingDiagnostic['stage']): void {
  respond({ type: 'error', ...identityOf(identity), diagnostic: snapshotDiagnostic(error, stage) });
}

function sendSnapshot(type: 'snapshot' | 'paused' | 'run-complete', identity: TeachingWorkerIdentity): void {
  if (!machine || !identityMatches(identity)) return;
  respond({ type, ...identityOf(identity), snapshot: machine.current, historyUpdate: updateHistory() });
}

function wakePendingRunDelay(): void {
  const wake = cancelPendingRunDelay;
  cancelPendingRunDelay = null;
  wake?.();
}

function waitForRunDelay(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => {
      if (cancelPendingRunDelay === finish) cancelPendingRunDelay = null;
      clearTimeout(timer);
      resolve();
    };
    timer = setTimeout(finish, delayMs);
    cancelPendingRunDelay = finish;
  });
}

async function runLoop(
  identity: TeachingWorkerIdentity,
  generation: number,
  sourceStepGoal: TeachingSourceStepGoal | null = null,
): Promise<void> {
  while (generation === runGeneration && identityMatches(identity) && machine) {
    if (pauseRequested) {
      pauseRequested = false;
      isRunning = false;
      activeRunCommand = null;
      setTeachingMachineStatus(machine, 'paused');
      sendSnapshot('paused', identity);
      return;
    }

    const pace = sourceStepGoal ? TEACHING_RUN_PACES.standard : getTeachingRunPace(teachingRunSpeed);
    for (let count = 0; count < pace.batchSize; count += 1) {
      if (generation !== runGeneration || !identityMatches(identity) || !machine) return;
      if (pauseRequested) break;
      const snapshot = stepTeachingMachine(machine, 'running');
      if (snapshot.status !== 'running') break;
      if (sourceStepGoal && program && isTeachingSourceStepGoalReached(sourceStepGoal, program, snapshot)) {
        setTeachingMachineStatus(machine, 'paused', 'step');
        break;
      }
    }

    if (generation !== runGeneration || !identityMatches(identity) || !machine) return;
    if (machine.current.status === 'paused') {
      isRunning = false;
      activeRunCommand = null;
      pauseRequested = false;
      sendSnapshot('paused', identity);
      return;
    }
    if (pauseRequested) continue;
    if (machine.current.status === 'finished' || machine.current.status === 'error') {
      isRunning = false;
      activeRunCommand = null;
      sendSnapshot('run-complete', identity);
      return;
    }

    respond({
      type: 'run-batch',
      ...identity,
      snapshot: machine.current,
      historyUpdate: updateHistory(),
    });
    await waitForRunDelay(pace.delayMs);
  }
}

function handleRequest(request: TeachingWorkerRequest): void {
  if (request.type === 'init') {
    if (!advanceIdentity(request)) return;
    respond({ type: 'ready', ...identityOf(request) });
    return;
  }

  if (request.type === 'compile') {
    if (!advanceIdentity(request)) return;
    try {
      breakpointSourceLines = [];
      breakpointInstructionIndexes = [];
      program = compileTeachingSource(request.source);
      machine = createTeachingMachine(program);
      respond({
        type: 'compiled',
        ...identityOf(request),
        program,
        snapshot: machine.current,
        historyUpdate: replaceHistory(),
      });
    } catch (error) {
      program = null;
      machine = null;
      sendError(request, error, 'compile');
    }
    return;
  }

  if (request.type === 'invalidate') {
    if (!advanceIdentity(request)) return;
    respond({ type: 'invalidated', ...identityOf(request) });
    return;
  }

  if (!identityMatches(request)) return;
  if (request.type === 'set-run-speed') {
    const nextSpeed = normalizeTeachingRunSpeed(request.speed);
    if (nextSpeed !== teachingRunSpeed) {
      teachingRunSpeed = nextSpeed;
      if (activeRunCommand === 'run') wakePendingRunDelay();
    }
    return;
  }
  if (request.type === 'set-breakpoints') {
    if (!machine || !program || isRunning) return;
    try {
      machine.setBreakpoints(request.sourceLines, request.instructionIndexes);
      breakpointSourceLines = [...request.sourceLines];
      breakpointInstructionIndexes = [...request.instructionIndexes];
      respond({
        type: 'breakpoints-updated',
        ...identityOf(request),
        sourceLines: [...breakpointSourceLines],
        instructionIndexes: [...breakpointInstructionIndexes],
      });
    } catch (error) {
      respond({
        type: 'worker-error',
        ...identityOf(request),
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  if (request.type === 'pause') {
    if (isRunning) {
      pauseRequested = true;
      wakePendingRunDelay();
    }
    return;
  }

  if (request.type === 'reset') {
    if (!program) {
      sendError(request, new TeachingDiagnostic('runtime', 'not-compiled', 'Compile source before resetting the VM.', { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 }), 'runtime');
      return;
    }
    cancelRun();
    machine = createTeachingMachine(program);
    machine.setBreakpoints(breakpointSourceLines, breakpointInstructionIndexes);
    respond({
      type: 'snapshot',
      ...identityOf(request),
      snapshot: machine.current,
      historyUpdate: replaceHistory(),
    });
    return;
  }

  if (!machine || !program) {
    sendError(request, new TeachingDiagnostic('runtime', 'not-compiled', 'Compile source before running the VM.', { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 }), 'runtime');
    return;
  }

  if (request.type === 'step') {
    if (isRunning) return;
    stepTeachingMachine(machine);
    sendSnapshot('snapshot', request);
    return;
  }

  if (request.type === 'run' || request.type === 'step-source') {
    if (isRunning || machine.current.status === 'finished' || machine.current.status === 'error') return;
    if (request.type === 'run') teachingRunSpeed = normalizeTeachingRunSpeed(request.speed);
    const sourceStepGoal = request.type === 'step-source'
      ? createTeachingSourceStepGoal(request.mode, program, machine.current)
      : null;
    if (request.type === 'step-source' && !sourceStepGoal) {
      sendSnapshot('snapshot', request);
      return;
    }
    isRunning = true;
    activeRunCommand = request.type;
    pauseRequested = false;
    const generation = ++runGeneration;
    setTeachingMachineStatus(machine, 'running');
    respond({
      type: 'run-started',
      ...identityOf(request),
      snapshot: machine.current,
      historyUpdate: updateHistory(),
    });
    const identity = identityOf(request);
    void runLoop(identity, generation, sourceStepGoal).catch((error: unknown) => {
      if (!identityMatches(identity)) return;
      isRunning = false;
      activeRunCommand = null;
      respond({
        type: 'worker-error',
        ...identity,
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

workerScope.addEventListener('message', (event: MessageEvent<TeachingWorkerRequest>) => {
  try {
    handleRequest(event.data);
  } catch (error) {
    const identity = activeIdentity;
    if (!identity) return;
    respond({
      type: 'worker-error',
      ...identity,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
