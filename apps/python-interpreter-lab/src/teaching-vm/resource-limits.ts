export const MAX_TOKEN_COUNT = 5_000;
export const MAX_PARSE_NESTING_DEPTH = 100;
export const MAX_INSTRUCTION_COUNT = 2_000;
export const MAX_BREAKPOINT_COUNT = MAX_INSTRUCTION_COUNT;
export const MAX_DYNAMIC_INSTRUCTION_COUNT = 5_000;
export const MAX_NAME_COUNT = 200;
export const MAX_INTEGER_BITS = 4_096;
export const MAX_STRING_CODE_POINTS = 4_096;
export const MAX_OUTPUT_CODE_POINTS = 32_768;
export const MAX_HISTORY_SNAPSHOTS = 500;
export const MAX_HISTORY_CONTAINER_RECORDS = 50_000;
export const MAX_ACTIVE_FRAME_COUNT = 64;
export const MAX_HEAP_OBJECTS = 256;
export const MAX_CONTAINER_ENTRIES = 256;
export const MAX_HEAP_ENTRIES = 2_048;

export type TeachingRunSpeed = 'slow' | 'standard' | 'fast';

export interface TeachingRunPace {
  readonly batchSize: number;
  readonly delayMs: number;
}

export const DEFAULT_TEACHING_RUN_SPEED: TeachingRunSpeed = 'standard';

export const TEACHING_RUN_PACES: Readonly<Record<TeachingRunSpeed, TeachingRunPace>> = Object.freeze({
  slow: Object.freeze({ batchSize: 1, delayMs: 250 }),
  standard: Object.freeze({ batchSize: 8, delayMs: 16 }),
  fast: Object.freeze({ batchSize: 32, delayMs: 16 }),
});

export function normalizeTeachingRunSpeed(speed: unknown): TeachingRunSpeed {
  return speed === 'slow' || speed === 'fast' || speed === 'standard'
    ? speed
    : DEFAULT_TEACHING_RUN_SPEED;
}

export function getTeachingRunPace(speed: unknown): TeachingRunPace {
  return TEACHING_RUN_PACES[normalizeTeachingRunSpeed(speed)];
}
