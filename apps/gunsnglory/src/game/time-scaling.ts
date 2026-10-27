export const MIN_SIMULATION_SPEED = 0.25;
export const MAX_SIMULATION_SPEED = 4;
export const SIMULATION_SPEED_STEP = 0.25;
export const DEFAULT_SIMULATION_SPEED = 1;
const MAX_GAME_STEP_MS = 100;

export function isSimulationSpeed(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= MIN_SIMULATION_SPEED
    && value <= MAX_SIMULATION_SPEED
    && Number.isInteger(value / SIMULATION_SPEED_STEP);
}

export function normalizeSimulationSpeed(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Simulation speed must be finite');
  const bounded = Math.min(MAX_SIMULATION_SPEED, Math.max(MIN_SIMULATION_SPEED, value));
  return Math.round(bounded / SIMULATION_SPEED_STEP) * SIMULATION_SPEED_STEP;
}

export class SimulationTimeAccumulator {
  private fractionalMs = 0;

  advanceElapsed(realDeltaMs: number, speed: number): number[] {
    if (!Number.isFinite(realDeltaMs) || realDeltaMs <= 0) return [];

    const scaledMs = this.fractionalMs + realDeltaMs * normalizeSimulationSpeed(speed);
    const wholeMs = Math.floor(scaledMs);
    this.fractionalMs = scaledMs - wholeMs;

    const steps: number[] = [];
    let pendingMs = wholeMs;
    while (pendingMs > MAX_GAME_STEP_MS) {
      steps.push(MAX_GAME_STEP_MS);
      pendingMs -= MAX_GAME_STEP_MS;
    }
    if (pendingMs > 0) steps.push(pendingMs);
    return steps;
  }

  reset(): void {
    this.fractionalMs = 0;
  }
}
