export interface ScenarioSampleOptions {
  sampleIntervalSeconds?: number;
  maxElapsedSeconds?: number;
  [key: string]: unknown;
}

export interface ScenarioPoint {
  time: number;
  population: number;
  [key: string]: number;
}

export interface ScenarioResult {
  timeSeries: ScenarioPoint[];
  endReason: string | null;
  metrics: Record<string, number | string | boolean | null>;
  metadata?: Record<string, unknown>;
}

export interface ScenarioAdapter {
  run?(config: unknown, seed: string, sampleOptions?: ScenarioSampleOptions): Promise<ScenarioResult> | ScenarioResult;
  runScenario?(config: unknown, seed: string, sampleOptions?: ScenarioSampleOptions): Promise<ScenarioResult> | ScenarioResult;
}

export interface ScenarioModule {
  runScenario?(config: unknown, seed: string, sampleOptions?: ScenarioSampleOptions): Promise<ScenarioResult> | ScenarioResult;
  createScenario?(config: unknown, seed: string, sampleOptions?: ScenarioSampleOptions): ScenarioAdapter | ((config: unknown, seed: string, sampleOptions?: ScenarioSampleOptions) => Promise<ScenarioResult> | ScenarioResult);
}

export interface ScenarioDescriptor {
  moduleUrl: string;
  exportName?: string;
}

export interface SimulationTask {
  config: unknown;
  seed: string;
  sampleOptions?: ScenarioSampleOptions;
  id?: string;
}

export type SimulationOutcome =
  | { id: string; status: 'succeeded'; config: unknown; seed: string; result: ScenarioResult }
  | { id: string; status: 'failed'; config: unknown; seed: string; error: { name: string; message: string; stack?: string } };

export interface SimulationPoolOptions {
  size: number;
  scenario: ScenarioDescriptor;
  workerExecArgv?: string[];
}

export class SimulationScenario {
  constructor(pool: SimulationWorkerPool);
  run(config: unknown, seed: string, sampleOptions?: ScenarioSampleOptions, id?: string): Promise<SimulationOutcome>;
  runBatch(tasks: SimulationTask[]): Promise<SimulationOutcome[]>;
}

export class SimulationWorkerPool {
  constructor(options: SimulationPoolOptions);
  readonly size: number;
  createScenario(): SimulationScenario;
  runBatch(tasks: SimulationTask[]): Promise<SimulationOutcome[]>;
  close(): Promise<void>;
}

export function percentile(values: number[], quantile: number): number;
export function kaplanMeierQuantile(observations: Array<{ time: number; event: boolean }>, quantile: number): number | null;
export function summarizeRuns(outcomes: SimulationOutcome[]): {
  succeeded: number;
  failed: number;
  byEndReason: Record<string, number>;
  metricQuantiles: Record<string, { p10: number; p50: number; p90: number }>;
};
export function timeToThreshold(timeSeries: ScenarioPoint[], threshold: number): number | null;
export function exportResults(outcomes: SimulationOutcome[], format?: 'json' | 'csv'): string;
