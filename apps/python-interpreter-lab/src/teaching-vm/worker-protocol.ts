import type {
  TeachingCompileResult,
  TeachingDiagnosticSnapshot,
  TeachingVmHistory,
  TeachingVmSnapshot,
} from './types';

export type TeachingHistoryUpdate =
  | { kind: 'replace'; history: TeachingVmHistory }
  | { kind: 'append'; items: readonly TeachingVmSnapshot[]; truncated: boolean }
  | { kind: 'replace-last'; snapshot: TeachingVmSnapshot; truncated: boolean };

export interface TeachingWorkerIdentity {
  sessionId: number;
  sourceRevision: number;
}

export type TeachingWorkerRequest =
  | ({ type: 'init' } & TeachingWorkerIdentity)
  | ({ type: 'compile'; source: string } & TeachingWorkerIdentity)
  | ({ type: 'invalidate' } & TeachingWorkerIdentity)
  | ({ type: 'step' } & TeachingWorkerIdentity)
  | ({ type: 'run' } & TeachingWorkerIdentity)
  | ({ type: 'pause' } & TeachingWorkerIdentity)
  | ({ type: 'reset' } & TeachingWorkerIdentity);

export type TeachingWorkerResponse =
  | ({ type: 'ready' } & TeachingWorkerIdentity)
  | ({ type: 'invalidated' } & TeachingWorkerIdentity)
  | ({ type: 'compiled'; program: TeachingCompileResult; snapshot: TeachingVmSnapshot; historyUpdate: TeachingHistoryUpdate } & TeachingWorkerIdentity)
  | ({ type: 'snapshot'; snapshot: TeachingVmSnapshot; historyUpdate: TeachingHistoryUpdate } & TeachingWorkerIdentity)
  | ({ type: 'run-started'; snapshot: TeachingVmSnapshot; historyUpdate: TeachingHistoryUpdate } & TeachingWorkerIdentity)
  | ({ type: 'run-batch'; snapshot: TeachingVmSnapshot; historyUpdate: TeachingHistoryUpdate } & TeachingWorkerIdentity)
  | ({ type: 'paused'; snapshot: TeachingVmSnapshot; historyUpdate: TeachingHistoryUpdate } & TeachingWorkerIdentity)
  | ({ type: 'run-complete'; snapshot: TeachingVmSnapshot; historyUpdate: TeachingHistoryUpdate } & TeachingWorkerIdentity)
  | ({ type: 'error'; diagnostic: TeachingDiagnosticSnapshot } & TeachingWorkerIdentity)
  | ({ type: 'worker-error'; message: string } & TeachingWorkerIdentity);

export function sameTeachingWorkerIdentity(
  left: TeachingWorkerIdentity,
  right: TeachingWorkerIdentity,
): boolean {
  return left.sessionId === right.sessionId && left.sourceRevision === right.sourceRevision;
}
