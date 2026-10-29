import type { TeachingCompileResult, TeachingVmSnapshot } from './types';

export type TeachingSourceStepMode = 'into' | 'over' | 'out';

export interface TeachingSourceStepGoal {
  mode: TeachingSourceStepMode;
  frameId: number;
  sourceLine: number;
  startStepIndex: number;
}

/** Captures the active frame and source line before a source-level step starts. */
export function createTeachingSourceStepGoal(
  mode: TeachingSourceStepMode,
  program: TeachingCompileResult,
  snapshot: TeachingVmSnapshot,
): TeachingSourceStepGoal | null {
  const frame = snapshot.frames.at(-1);
  const instructionIndex = snapshot.nextInstructionIndex;
  const instruction = instructionIndex === null ? undefined : program.instructions[instructionIndex];
  if (!frame || !instruction || (mode === 'out' && frame.kind === 'module')) return null;

  return Object.freeze({
    mode,
    frameId: frame.id,
    sourceLine: instruction.span.line,
    startStepIndex: snapshot.stepIndex,
  });
}

/** Returns true after an executed instruction reaches the requested frame/line boundary. */
export function isTeachingSourceStepGoalReached(
  goal: TeachingSourceStepGoal,
  program: TeachingCompileResult,
  snapshot: TeachingVmSnapshot,
): boolean {
  if (snapshot.status !== 'running' || snapshot.stepIndex <= goal.startStepIndex) return false;

  const activeFrame = snapshot.frames.at(-1);
  if (!activeFrame) return false;
  const originFrameIsActive = snapshot.frames.some((frame) => frame.id === goal.frameId);
  const nextInstruction = snapshot.nextInstructionIndex === null
    ? undefined
    : program.instructions[snapshot.nextInstructionIndex];
  const nextSourceLine = nextInstruction?.span.line ?? null;

  switch (goal.mode) {
    case 'into':
      return activeFrame.id !== goal.frameId || nextSourceLine !== goal.sourceLine;
    case 'over':
      return !originFrameIsActive
        || (activeFrame.id === goal.frameId && nextSourceLine !== goal.sourceLine);
    case 'out':
      return !originFrameIsActive;
  }
}
