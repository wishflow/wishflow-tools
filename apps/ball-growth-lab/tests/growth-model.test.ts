import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../src/types';
import { fitGrowthModel, isGrowthPredictionValidated, predictGrowth } from '../src/growthModel';

function outcome(seed: string, speedScale: number) {
  return {
    status: 'succeeded' as const,
    config: { ...DEFAULT_CONFIG, seed },
    seed,
    result: {
      timeSeries: [
        { time: 0, population: 2, births: 0, exits: 0, collisionEvents: 0, collisionClosingSpeedSum: 0, cooldownAccepted: 0, cooldownRejected: 0, birthProbabilityPassed: 0, birthSpaceAttempts: 0, speedSum: 22 * speedScale },
        { time: 0.5, population: 2, births: 0, exits: 0, collisionEvents: 1, collisionClosingSpeedSum: 12, cooldownAccepted: 1, cooldownRejected: 0, birthProbabilityPassed: 0, birthSpaceAttempts: 0, speedSum: 21 * speedScale },
        { time: 1, population: 3, births: 1, exits: 0, collisionEvents: 2, collisionClosingSpeedSum: 25, cooldownAccepted: 2, cooldownRejected: 0, birthProbabilityPassed: 1, birthSpaceAttempts: 1, speedSum: 30 * speedScale },
        { time: 1.5, population: 3, births: 1, exits: 0, collisionEvents: 3, collisionClosingSpeedSum: 38, cooldownAccepted: 3, cooldownRejected: 0, birthProbabilityPassed: 1, birthSpaceAttempts: 1, speedSum: 31 * speedScale },
      ],
      endReason: 'observation-window',
      metrics: { elapsedSeconds: 1.5 },
    },
  };
}

test('growth regression prediction is repeatable and exposes quantile ordering', () => {
  const validation = {
    t10To90MedianRelativeError: null,
    t10To90CompletionRateAbsoluteError: null,
    intervalCoverage80: null,
    validationRuns: 0,
    minimumSeedsPerConfig: 20,
    t10To90Target: 0.1,
    intervalCoverageTarget: [0.75, 0.85] as [number, number],
    configurationDiagnostics: [],
    accepted: false,
  };
  const training = [outcome('MODEL-A', 1), outcome('MODEL-B', 1.04), outcome('MODEL-C', 0.96)];
  const model = fitGrowthModel(training, validation, 1);
  assert.equal(model.calibrated, true);
  assert.equal(model.trainingRuns, 3);
  assert.ok(model.regressions.birthOpportunityLog.length > 0);
  assert.ok(model.contactStudy.observations > 0);
  const first = predictGrowth(DEFAULT_CONFIG, model, { replicates: 32, seed: 'stable' });
  const second = predictGrowth(DEFAULT_CONFIG, model, { replicates: 32, seed: 'stable' });
  assert.deepEqual(first, second);
  assert.ok(first.length > 1);
  for (const point of first) {
    assert.ok(point.p10 <= point.p50);
    assert.ok(point.p50 <= point.p90);
  }
  assert.equal(isGrowthPredictionValidated(DEFAULT_CONFIG, model), false);
});
