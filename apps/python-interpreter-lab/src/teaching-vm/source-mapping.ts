import { MAX_BREAKPOINT_COUNT } from './resource-limits';
import type {
  TeachingBreakpoint,
  TeachingCompileResult,
  TeachingSourceLineMapping,
} from './types';

/** Maps each executable source line to its first teaching instruction. */
export function mapTeachingSourceLines(
  program: TeachingCompileResult,
): readonly TeachingSourceLineMapping[] {
  const firstInstructionByLine = new Map<number, number>();

  for (const instruction of program.instructions) {
    if (instruction.opcode === 'HALT' || firstInstructionByLine.has(instruction.span.line)) continue;
    firstInstructionByLine.set(instruction.span.line, instruction.index);
  }

  return Object.freeze([...firstInstructionByLine]
    .sort(([leftLine], [rightLine]) => leftLine - rightLine)
    .map(([line, instructionIndex]) => Object.freeze({ line, instructionIndex })));
}

/** Creates canonical, serializable source-line breakpoints for one compiled program. */
export function createTeachingBreakpoints(
  program: TeachingCompileResult,
  sourceLines: readonly number[],
): readonly TeachingBreakpoint[] {
  if (sourceLines.length > MAX_BREAKPOINT_COUNT) {
    throw new RangeError(`Breakpoint count exceeds ${MAX_BREAKPOINT_COUNT}.`);
  }

  const instructionByLine = new Map(
    mapTeachingSourceLines(program).map(({ line, instructionIndex }) => [line, instructionIndex]),
  );
  const seenLines = new Set<number>();
  const breakpoints: TeachingBreakpoint[] = [];

  for (const line of sourceLines) {
    if (!Number.isSafeInteger(line) || line < 1) {
      throw new RangeError('Breakpoint source lines must be positive integers.');
    }
    if (seenLines.has(line)) throw new RangeError(`Duplicate source line ${line} breakpoint.`);
    seenLines.add(line);

    const instructionIndex = instructionByLine.get(line);
    if (instructionIndex === undefined) {
      throw new RangeError(`Source line ${line} has no executable instruction.`);
    }
    breakpoints.push(Object.freeze({
      id: `source-line:${line}`,
      line,
      instructionIndex,
    }));
  }

  return Object.freeze(breakpoints.sort((left, right) => left.line - right.line));
}
