import type { SimulationSpeed } from '../types';

const MAX_REAL_ELAPSED_SECONDS = 0.1;
const STEP_EPSILON_SECONDS = 1e-9;

/** Converts wall-clock time into fixed physics steps without changing physics step size. */
export class SimulationClock {
  private previousTimestampMs: number | null = null;
  private accumulatedSeconds = 0;

  constructor(private readonly fixedStepSeconds: number) {}

  reset(timestampMs: number, clearAccumulator = false): void {
    this.previousTimestampMs = timestampMs;
    if (clearAccumulator) this.accumulatedSeconds = 0;
  }

  advance(timestampMs: number, speed: SimulationSpeed, maxSteps: number): number {
    if (this.previousTimestampMs === null) {
      this.reset(timestampMs);
      return 0;
    }

    const elapsedSeconds = Math.min(
      MAX_REAL_ELAPSED_SECONDS,
      Math.max(0, (timestampMs - this.previousTimestampMs) / 1000),
    );
    this.previousTimestampMs = timestampMs;
    this.accumulatedSeconds += elapsedSeconds * speed;

    const availableSteps = Math.floor((this.accumulatedSeconds + STEP_EPSILON_SECONDS) / this.fixedStepSeconds);
    const steps = Math.min(availableSteps, maxSteps);
    this.accumulatedSeconds = Math.max(0, this.accumulatedSeconds - steps * this.fixedStepSeconds);
    return steps;
  }
}
