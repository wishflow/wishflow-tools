import assert from 'node:assert/strict';
import test from 'node:test';
import { createReplayExport } from '../src/replay';
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
  });
  const restored = JSON.parse(JSON.stringify(replay));

  assert.equal(restored.format, 'ball-growth-lab.replay');
  assert.equal(restored.formatVersion, 4);
  assert.equal(restored.physics.engine, 'CircleBatch2D');
  assert.equal(restored.physics.engineVersion, '2');
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
