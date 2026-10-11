import assert from 'node:assert/strict';
import test from 'node:test';
import { createReplayExport } from '../src/replay';
import type { GrowthModelArtifact } from '../src/growthModel';
import { DEFAULT_CONFIG, FIXED_STEP_SECONDS } from '../src/types';

test('复现导出包含可重放参数和现场诊断，并可 JSON 往返', () => {
  const config = { ...DEFAULT_CONFIG, seed: 'REPLAY-42', initialCount: 42 };
  const stats = {
    elapsedSeconds: 12.3456,
    currentCount: 73,
    births: 31,
    birthAttempts: 60,
    exits: 0,
    missedBirths: 29,
    missedSpaceBirths: 21,
    missedEnergyBirths: 8,
    birthKineticEnergyAdded: 23.45,
    birthMomentumAdded: { x: -2.4, y: -8.2 },
    maxSpeed: 18.4,
    speedSum: 246.8,
    collisionEvents: 61,
    collisionClosingSpeedSum: 344.2,
    cooldownAccepted: 60,
    cooldownRejected: 1,
    birthProbabilityPassed: 31,
    birthSpaceAttempts: 31,
  };
  const growthModel: GrowthModelArtifact = {
    format: 'ball-growth-lab.growth-model',
    version: 3,
    trainedAt: '',
    calibrated: false,
    trainingConfigCount: 0,
    validationConfigCount: 0,
    trainingRuns: 0,
    validation: {
      t10To90MedianRelativeError: null,
      t10To90CompletionRateAbsoluteError: null,
      intervalCoverage80: null,
      validationRuns: 0,
      minimumSeedsPerConfig: 20,
      t10To90Target: 0.1,
      intervalCoverageTarget: [0.75, 0.85],
      configurationDiagnostics: [],
      accepted: false,
    },
    horizonSeconds: 0,
    ranges: {},
    fixedParameters: { initialCount: 2, maxPopulation: 1000, birthProbability: 1, birthCooldown: 8, pairCooldown: 0.7, restitution: 1 },
    regressions: { collisionLog: [], birthOpportunityLog: [], cooldownLogit: [], spaceLogit: [], exitLog: [], speedLog: [] },
    rateNoiseSigma: 0,
    contactStudy: { observations: 0, medianCorrection: 0, cooldownAvailability: 0, spaceAvailability: 0, meanExitRatePerBallSecond: 0 },
  };
  const replay = createReplayExport({
    config,
    runState: 'paused',
    endReason: null,
    stats,
    rendererFps: 59,
    environment: {
      userAgent: 'Test Browser',
      language: 'zh-CN',
      viewport: { width: 390, height: 844, devicePixelRatio: 3 },
    },
    growthModel,
  });
  const restored = JSON.parse(JSON.stringify(replay));

  assert.equal(restored.format, 'ball-growth-lab.replay');
  assert.equal(restored.formatVersion, 5);
  assert.equal(restored.physics.engine, 'CircleBatch2D');
  assert.equal(restored.physics.engineVersion, '2');
  assert.equal(restored.growthModel.version, 3);
  assert.equal(restored.growthModel.trainingConfigCount, 0);
  assert.equal(restored.growthModel.contactStudy.observations, 0);
  assert.deepEqual(restored.physics.birthRule, {
    massModel: 'unit-mass',
    speedSampling: 'uniform-squared-speed-between-post-impact-parent-speeds',
    direction: 'isotropic-at-zero-gravity-upward-270deg-plus-minus-45deg-otherwise',
    parentVelocityMutation: false,
  });
  assert.deepEqual(restored.config, config);
  assert.deepEqual(restored.environment.viewport, { width: 390, height: 844, devicePixelRatio: 3 });
  assert.equal(restored.observation.runState, 'paused');
  assert.equal(restored.observation.endReason, null);
  assert.equal(restored.observation.elapsedSeconds, stats.elapsedSeconds);
  assert.equal(restored.observation.physicsSteps, Math.round(stats.elapsedSeconds / FIXED_STEP_SECONDS));
  assert.equal(restored.observation.rendererFps, 59);
  assert.deepEqual(restored.observation.stats, stats);
});
