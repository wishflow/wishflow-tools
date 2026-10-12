import { CircleBatchSimulation } from './physics/CircleBatchSimulation';
import { FIXED_STEP_SECONDS, type SimulationConfig, type SimulationStats } from './types';

interface ScenarioOptions {
  sampleIntervalSeconds?: number;
  maxElapsedSeconds?: number;
  stopAtFirstBirth?: boolean;
}

function samplePoint(time: number, stats: SimulationStats) {
  return {
    time,
    population: stats.currentCount,
    births: stats.births,
    birthAttempts: stats.birthAttempts,
    exits: stats.exits,
    missedBirths: stats.missedBirths,
    collisionEvents: stats.collisionEvents,
    birthGraceSuppressed: stats.birthGraceSuppressed,
    collisionClosingSpeedSum: stats.collisionClosingSpeedSum,
    cooldownAccepted: stats.cooldownAccepted,
    cooldownRejected: stats.cooldownRejected,
    birthProbabilityPassed: stats.birthProbabilityPassed,
    birthSpaceAttempts: stats.birthSpaceAttempts,
    speedSum: stats.speedSum,
  };
}

/** Runs the production physics scene through its public constructor/step/statistics interface. */
export function runScenario(config: SimulationConfig, seed: string, options: ScenarioOptions = {}) {
  const scenarioConfig = { ...config, seed };
  const sampleInterval = Math.max(FIXED_STEP_SECONDS, options.sampleIntervalSeconds ?? 0.5);
  const simulation = new CircleBatchSimulation(scenarioConfig);
  const initial = simulation.getStatsSnapshot();
  const threshold10 = Math.max(scenarioConfig.initialCount + 1, Math.ceil(scenarioConfig.maxPopulation * 0.1));
  const threshold90 = Math.ceil(scenarioConfig.maxPopulation * 0.9);
  let threshold10Seconds: number | null = initial.currentCount >= threshold10 ? 0 : null;
  let threshold90Seconds: number | null = initial.currentCount >= threshold90 ? 0 : null;
  const timeSeries = [samplePoint(0, initial)];
  let previousBirths = initial.births;
  let firstBirthSeconds: number | null = null;
  let nextSampleTime = sampleInterval;
  let endReason: string | null = null;
  let elapsedSeconds = 0;

  try {
    while (!simulation.isEnded) {
      if (options.maxElapsedSeconds !== undefined && elapsedSeconds >= options.maxElapsedSeconds) {
        endReason = 'observation-window';
        break;
      }
      simulation.step(FIXED_STEP_SECONDS);
      elapsedSeconds += FIXED_STEP_SECONDS;
      const population = simulation.populationCount;
      if (threshold10Seconds === null && population >= threshold10) threshold10Seconds = elapsedSeconds;
      if (threshold90Seconds === null && population >= threshold90) threshold90Seconds = elapsedSeconds;
      const birthObserved = simulation.birthCount > previousBirths;
      if (birthObserved) {
        firstBirthSeconds ??= elapsedSeconds;
        previousBirths = simulation.birthCount;
      }
      const shouldSample = elapsedSeconds + FIXED_STEP_SECONDS / 2 >= nextSampleTime;
      if (!options.stopAtFirstBirth && !shouldSample && !simulation.isEnded) continue;
      if (options.stopAtFirstBirth && !birthObserved && !shouldSample && !simulation.isEnded) continue;

      const stats = simulation.getStatsSnapshot();
      if (shouldSample) {
        timeSeries.push(samplePoint(stats.elapsedSeconds, stats));
        nextSampleTime += sampleInterval;
      }
      if (options.stopAtFirstBirth && birthObserved) {
        endReason = 'first-birth-observed';
        break;
      }
    }

    const finalSnapshot = simulation.getSnapshot();
    const finalPoint = samplePoint(finalSnapshot.stats.elapsedSeconds, finalSnapshot.stats);
    if (timeSeries.at(-1)?.time === finalPoint.time) timeSeries[timeSeries.length - 1] = finalPoint;
    else timeSeries.push(finalPoint);
    return {
      timeSeries,
      endReason: endReason ?? finalSnapshot.endReason,
      metrics: {
        elapsedSeconds: finalSnapshot.stats.elapsedSeconds,
        finalPopulation: finalSnapshot.stats.currentCount,
        births: finalSnapshot.stats.births,
        birthAttempts: finalSnapshot.stats.birthAttempts,
        exits: finalSnapshot.stats.exits,
        missedBirths: finalSnapshot.stats.missedBirths,
        missedSpaceBirths: finalSnapshot.stats.missedSpaceBirths,
        firstBirthSeconds,
        t10Seconds: threshold10Seconds,
        t90Seconds: threshold90Seconds,
        t10To90Seconds: threshold10Seconds !== null && threshold90Seconds !== null && threshold90Seconds > threshold10Seconds
          ? threshold90Seconds - threshold10Seconds
          : null,
        collisionEvents: finalSnapshot.stats.collisionEvents,
        birthGraceSuppressed: finalSnapshot.stats.birthGraceSuppressed,
        collisionClosingSpeedSum: finalSnapshot.stats.collisionClosingSpeedSum,
        cooldownAccepted: finalSnapshot.stats.cooldownAccepted,
        cooldownRejected: finalSnapshot.stats.cooldownRejected,
        birthProbabilityPassed: finalSnapshot.stats.birthProbabilityPassed,
        birthSpaceAttempts: finalSnapshot.stats.birthSpaceAttempts,
        meanSpeed: finalSnapshot.stats.speedSum / Math.max(1, finalSnapshot.stats.currentCount),
      },
      metadata: {
        solver: 'CircleBatch2D',
        fixedStepSeconds: FIXED_STEP_SECONDS,
        sampleIntervalSeconds: sampleInterval,
        maxElapsedSeconds: options.maxElapsedSeconds ?? null,
        stopAtFirstBirth: options.stopAtFirstBirth ?? false,
      },
    };
  } finally {
    simulation.dispose();
  }
}
