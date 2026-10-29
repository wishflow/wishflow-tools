import { compileTeachingSource } from '../teaching-vm/compiler';
import { MAX_RUN_BATCH_SIZE, TEACHING_RUN_BATCH_DELAY_MS } from '../teaching-vm/resource-limits';
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
let pauseRequested = false;
let lastPublishedStepIndex = -1;

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
    lastPublishedStepIndex = -1;
  }
  return true;
}

function cancelRun(): void {
  runGeneration += 1;
  isRunning = false;
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

async function runLoop(identity: TeachingWorkerIdentity, generation: number): Promise<void> {
  while (generation === runGeneration && identityMatches(identity) && machine) {
    if (pauseRequested) {
      pauseRequested = false;
      isRunning = false;
      setTeachingMachineStatus(machine, 'paused');
      sendSnapshot('paused', identity);
      return;
    }

    for (let count = 0; count < MAX_RUN_BATCH_SIZE; count += 1) {
      if (generation !== runGeneration || !identityMatches(identity) || !machine) return;
      if (pauseRequested) break;
      const snapshot = stepTeachingMachine(machine, 'running');
      if (snapshot.status === 'finished' || snapshot.status === 'error') break;
    }

    if (generation !== runGeneration || !identityMatches(identity) || !machine) return;
    if (pauseRequested) continue;
    if (machine.current.status === 'finished' || machine.current.status === 'error') {
      isRunning = false;
      sendSnapshot('run-complete', identity);
      return;
    }

    respond({
      type: 'run-batch',
      ...identity,
      snapshot: machine.current,
      historyUpdate: updateHistory(),
    });
    await new Promise<void>((resolve) => setTimeout(resolve, TEACHING_RUN_BATCH_DELAY_MS));
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
  if (request.type === 'pause') {
    if (isRunning) pauseRequested = true;
    return;
  }

  if (request.type === 'reset') {
    if (!program) {
      sendError(request, new TeachingDiagnostic('runtime', 'not-compiled', 'Compile source before resetting the VM.', { start: 0, end: 0, line: 1, column: 1, endLine: 1, endColumn: 1 }), 'runtime');
      return;
    }
    cancelRun();
    machine = createTeachingMachine(program);
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

  if (request.type === 'run') {
    if (isRunning || machine.current.status === 'finished' || machine.current.status === 'error') return;
    isRunning = true;
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
    void runLoop(identity, generation).catch((error: unknown) => {
      if (!identityMatches(identity)) return;
      isRunning = false;
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
