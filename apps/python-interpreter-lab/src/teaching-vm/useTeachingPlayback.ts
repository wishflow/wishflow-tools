import { useCallback, useEffect, useRef, useState } from 'react';
import type { TeachingCompileResult, TeachingVmHistory, TeachingVmSnapshot } from './types';
import {
  deriveTeachingAnimationTransitions,
  type TeachingAnimationTransition,
} from './animation';
import type { TeachingSourceStepResult, TeachingStatus } from './useTeachingVm';

export const TEACHING_ANIMATION_PHASE_DURATION_MS = 120;

export type TeachingPlaybackPhase = 'idle' | 'requesting' | 'presenting' | 'pausing';

export interface TeachingPlaybackPresentation {
  snapshot: TeachingVmSnapshot;
  transition: TeachingAnimationTransition | null;
  stage: 'before' | 'after';
  baselineAvailable: boolean;
  omittedCount: number;
}

interface TeachingPlaybackOptions {
  program: TeachingCompileResult | null;
  history: TeachingVmHistory;
  status: TeachingStatus;
  atHead: boolean;
  stepSourceAndWait(mode: 'over'): Promise<TeachingSourceStepResult | null>;
  pauseWorker(): void;
}

export function useTeachingPlayback({ program, history, status, atHead, stepSourceAndWait, pauseWorker }: TeachingPlaybackOptions) {
  const [phase, setPhase] = useState<TeachingPlaybackPhase>('idle');
  const [presentation, setPresentation] = useState<TeachingPlaybackPresentation | null>(null);
  const activeRef = useRef(false);
  const generationRef = useRef(0);
  const phaseRef = useRef<TeachingPlaybackPhase>('idle');
  const delayRef = useRef<{ timer: number; resolve(): void } | null>(null);
  const latestRef = useRef({ program, history, status, atHead, stepSourceAndWait, pauseWorker });
  latestRef.current = { program, history, status, atHead, stepSourceAndWait, pauseWorker };

  const setPlaybackPhase = useCallback((next: TeachingPlaybackPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const cancelDelay = useCallback(() => {
    const pending = delayRef.current;
    if (!pending) return;
    delayRef.current = null;
    window.clearTimeout(pending.timer);
    pending.resolve();
  }, []);

  const waitForPhase = useCallback(() => new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      if (delayRef.current?.timer === timer) delayRef.current = null;
      resolve();
    }, TEACHING_ANIMATION_PHASE_DURATION_MS);
    delayRef.current = { timer, resolve };
  }), []);

  const finish = useCallback(() => {
    activeRef.current = false;
    generationRef.current += 1;
    cancelDelay();
    setPresentation(null);
    setPlaybackPhase('idle');
  }, [cancelDelay, setPlaybackPhase]);

  const run = useCallback(async (generation: number, startSnapshot: TeachingVmSnapshot) => {
    let before = startSnapshot;
    while (activeRef.current && generation === generationRef.current) {
      const current = latestRef.current;
      setPlaybackPhase('requesting');
      const result = await current.stepSourceAndWait('over');
      if (!activeRef.current || generation !== generationRef.current) return;
      if (!result) {
        finish();
        return;
      }

      if (isPausePending(phaseRef)) {
        finish();
        return;
      }

      const afterSnapshots = result.history.items.filter(({ stepIndex }) => stepIndex > before.stepIndex);
      const derivation = current.program
        ? deriveTeachingAnimationTransitions(current.program, before, afterSnapshots)
        : { baselineAvailable: false, transitions: [], omittedCount: 0 };

      for (const transition of derivation.transitions) {
        if (!activeRef.current || generation !== generationRef.current) return;
        setPlaybackPhase('presenting');
        setPresentation({
          snapshot: transition.before,
          transition,
          stage: 'before',
          baselineAvailable: derivation.baselineAvailable,
          omittedCount: 0,
        });
        await waitForPhase();
        if (!activeRef.current || generation !== generationRef.current) return;
        if (isPausePending(phaseRef)) {
          finish();
          return;
        }
        setPresentation({
          snapshot: transition.after,
          transition,
          stage: 'after',
          baselineAvailable: derivation.baselineAvailable,
          omittedCount: 0,
        });
        await waitForPhase();
        if (!activeRef.current || generation !== generationRef.current) return;
        if (isPausePending(phaseRef)) {
          finish();
          return;
        }
      }

      if (derivation.transitions.length === 0 || derivation.omittedCount > 0 || !derivation.baselineAvailable) {
        setPlaybackPhase('presenting');
        setPresentation({
          snapshot: result.snapshot,
          transition: null,
          stage: 'after',
          baselineAvailable: derivation.baselineAvailable,
          omittedCount: derivation.omittedCount,
        });
        await waitForPhase();
        if (!activeRef.current || generation !== generationRef.current) return;
        if (isPausePending(phaseRef)) {
          finish();
          return;
        }
      }

      setPresentation(null);
      before = result.snapshot;
      if (result.snapshot.status === 'finished' || result.snapshot.status === 'error'
        || result.snapshot.pauseReason === 'breakpoint' || result.snapshot.pauseReason === 'user') {
        finish();
        return;
      }
    }
  }, [finish, setPlaybackPhase, waitForPhase]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    const current = latestRef.current;
    const startSnapshot = current.history.items.at(-1);
    if (!current.program || !startSnapshot || !current.atHead || (current.status !== 'ready' && current.status !== 'paused')) return;
    activeRef.current = true;
    const generation = ++generationRef.current;
    setPlaybackPhase('requesting');
    void run(generation, startSnapshot);
  }, [run, setPlaybackPhase]);

  const pause = useCallback(() => {
    if (!activeRef.current) return;
    if (phaseRef.current === 'requesting' || phaseRef.current === 'pausing') {
      setPlaybackPhase('pausing');
      latestRef.current.pauseWorker();
      return;
    }
    finish();
  }, [finish, setPlaybackPhase]);

  const cancel = useCallback(() => finish(), [finish]);

  useEffect(() => () => {
    activeRef.current = false;
    generationRef.current += 1;
    cancelDelay();
  }, [cancelDelay]);

  const canStart = Boolean(program && history.items.length > 0 && atHead
    && (status === 'ready' || status === 'paused') && phase === 'idle');
  return {
    phase,
    presentation,
    isActive: phase !== 'idle',
    canStart,
    start,
    pause,
    cancel,
  };
}

function isPausePending(phase: { current: TeachingPlaybackPhase }): boolean {
  return phase.current === 'pausing';
}
