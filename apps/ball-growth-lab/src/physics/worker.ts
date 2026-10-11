import { CircleBatchSimulation } from './CircleBatchSimulation';
import { SimulationClock } from './SimulationClock';
import { FIXED_STEP_SECONDS, type SimulationConfig, type SimulationSpeed, type WorkerCommand } from '../types';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
const SNAPSHOT_INTERVAL_MS = 1000 / 60;
const MAX_STEPS_PER_TICK = 6;

let simulation: CircleBatchSimulation | null = null;
const simulationClock = new SimulationClock(FIXED_STEP_SECONDS);
let running = false;
let requestedRunning = false;
let simulationSpeed: SimulationSpeed = 1;
let lastSnapshotTime = 0;
let physicsWindowStart = 0;
let physicsWindowSteps = 0;
let physicsFps = 0;
let sequence = 0;
let timer = 0;
let runId = 0;
function start(config: SimulationConfig, currentRunId: number): void {
  runId = currentRunId;
  sequence = 0;
  simulation?.dispose();
  simulation = null;
  requestedRunning = true;
  running = false;
  simulationSpeed = 1;
  simulation = new CircleBatchSimulation(config);
  running = requestedRunning && !simulation.isEnded;
  const now = performance.now();
  simulationClock.reset(now, true);
  lastSnapshotTime = now;
  physicsWindowStart = now;
  physicsWindowSteps = 0;
  physicsFps = 0;
  sendSnapshot();
}

function sendSnapshot(): void {
  if (!simulation) return;
  const snapshot = simulation.getRenderSnapshot();
  const { ballData } = snapshot;

  workerScope.postMessage({
    type: 'snapshot',
    runId,
    sequence: sequence++,
    time: snapshot.stats.elapsedSeconds,
    ballData: ballData.buffer,
    ballCount: snapshot.stats.currentCount,
    stats: { ...snapshot.stats, physicsFps },
    ended: snapshot.ended,
    endReason: snapshot.endReason,
  }, [ballData.buffer]);
}

function tick(): void {
  if (!running || !simulation) return;
  const now = performance.now();
  const stepsToRun = simulationClock.advance(now, simulationSpeed, MAX_STEPS_PER_TICK);

  let steps = 0;
  for (let step = 0; step < stepsToRun; step += 1) {
    simulation.step(FIXED_STEP_SECONDS);
    steps += 1;
    if (simulation.isEnded) {
      running = false;
      sendSnapshot();
      break;
    }
  }

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

function handleCommand(command: WorkerCommand): void {
  try {
    if (command.type === 'start') {
      start(command.config, command.runId);
    } else if (command.type === 'pause') {
      requestedRunning = false;
      running = false;
      simulationClock.reset(performance.now());
      sendSnapshot();
    } else if (command.type === 'resume') {
      if (simulation?.isEnded) return;
      requestedRunning = true;
      simulationClock.reset(performance.now());
      running = Boolean(simulation);
    } else if (command.type === 'set-speed') {
      simulationSpeed = command.speed;
      simulationClock.reset(performance.now());
    } else if (command.type === 'finish') {
      requestedRunning = false;
      running = false;
      simulation?.finishManually();
      sendSnapshot();
    } else if (command.type === 'stop') {
      requestedRunning = false;
      running = false;
      simulation?.dispose();
      simulation = null;
    }
  } catch (error) {
    requestedRunning = false;
    running = false;
    simulationClock.reset(performance.now(), true);
    workerScope.postMessage({ runId, type: 'error', message: error instanceof Error ? error.message : '物理模拟初始化失败。' });
  }
}

workerScope.onmessage = (event: MessageEvent<WorkerCommand>) => {
  handleCommand(event.data);
};

timer = workerScope.setInterval(tick, 4);
workerScope.addEventListener('close', () => {
  workerScope.clearInterval(timer);
  simulation?.dispose();
});
