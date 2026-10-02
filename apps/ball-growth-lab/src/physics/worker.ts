import { initializeRapier, RapierSimulation } from './RapierSimulation';
import { FIXED_STEP_SECONDS, type SimulationConfig, type SimulationSnapshot, type WorkerCommand } from '../types';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
const SNAPSHOT_INTERVAL_MS = 1000 / 30;
const MAX_STEPS_PER_TICK = 6;

let simulation: RapierSimulation | null = null;
let running = false;
let accumulator = 0;
let previousTime = 0;
let lastSnapshotTime = 0;
let physicsWindowStart = 0;
let physicsWindowSteps = 0;
let physicsFps = 0;
let sequence = 0;
let timer = 0;
let runId = 0;
let startVersion = 0;
let rapierInitialization: Promise<unknown> | null = null;

function loadRapier(): Promise<unknown> {
  if (!rapierInitialization) {
    rapierInitialization = import('@dimforge/rapier2d')
      .then(async (rapier) => {
        await initializeRapier(rapier);
        return rapier;
      })
      .catch((error: unknown) => {
        rapierInitialization = null;
        throw error;
      });
  }
  return rapierInitialization;
}

async function start(config: SimulationConfig, currentRunId: number): Promise<void> {
  const currentVersion = ++startVersion;
  runId = currentRunId;
  sequence = 0;
  simulation?.dispose();
  simulation = null;
  running = true;
  accumulator = 0;
  const rapier = await loadRapier();
  if (currentVersion !== startVersion) return;
  simulation = new RapierSimulation(rapier, config);
  previousTime = performance.now();
  lastSnapshotTime = previousTime;
  physicsWindowStart = previousTime;
  physicsWindowSteps = 0;
  physicsFps = 0;
  sendSnapshot();
}

function sendSnapshot(): void {
  if (!simulation) return;
  const snapshot: SimulationSnapshot = simulation.getSnapshot();
  const valuesPerBall = 6;
  const ballData = new Float32Array(snapshot.balls.length * valuesPerBall);

  snapshot.balls.forEach((ball, index) => {
    const offset = index * valuesPerBall;
    ballData[offset] = ball.id;
    ballData[offset + 1] = ball.x;
    ballData[offset + 2] = ball.y;
    ballData[offset + 3] = ball.radius;
    ballData[offset + 4] = ball.color;
    ballData[offset + 5] = ball.shape === 'circle' ? 0 : 1;
  });

  workerScope.postMessage({
    type: 'snapshot',
    runId,
    sequence: sequence++,
    time: snapshot.stats.elapsedSeconds,
    ballData: ballData.buffer,
    ballCount: snapshot.balls.length,
    stats: { ...snapshot.stats, physicsFps },
  }, [ballData.buffer]);
}

function tick(): void {
  if (!running || !simulation) return;
  const now = performance.now();
  const elapsed = Math.min((now - previousTime) / 1000, 0.1);
  previousTime = now;
  accumulator += elapsed;

  let steps = 0;
  while (accumulator >= FIXED_STEP_SECONDS && steps < MAX_STEPS_PER_TICK) {
    simulation.step(FIXED_STEP_SECONDS);
    accumulator -= FIXED_STEP_SECONDS;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_TICK && accumulator >= FIXED_STEP_SECONDS) accumulator = 0;

  physicsWindowSteps += steps;
  if (now - physicsWindowStart >= 1000) {
    physicsFps = Math.round((physicsWindowSteps * 1000) / (now - physicsWindowStart));
    physicsWindowStart = now;
    physicsWindowSteps = 0;
  }
  if (now - lastSnapshotTime >= SNAPSHOT_INTERVAL_MS) {
    lastSnapshotTime = now;
    sendSnapshot();
  }
}

async function handleCommand(command: WorkerCommand): Promise<void> {
  try {
    if (command.type === 'start' || command.type === 'reset') {
      await start(command.config, command.runId);
    } else if (command.type === 'pause') {
      running = false;
      sendSnapshot();
    } else if (command.type === 'resume') {
      previousTime = performance.now();
      running = true;
    } else if (command.type === 'stop') {
      startVersion += 1;
      running = false;
      simulation?.dispose();
      simulation = null;
    }
  } catch (error) {
    workerScope.postMessage({ runId, type: 'error', message: error instanceof Error ? error.message : '物理模拟初始化失败。' });
  }
}

workerScope.onmessage = (event: MessageEvent<WorkerCommand>) => {
  void handleCommand(event.data);
};

timer = workerScope.setInterval(tick, 4);
workerScope.addEventListener('close', () => {
  workerScope.clearInterval(timer);
  simulation?.dispose();
});
