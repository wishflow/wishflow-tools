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
    maxSpeed: 18.4,
  };
  const replay = createReplayExport({
    config,
    runState: 'paused',
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
  assert.equal(restored.formatVersion, 1);
  assert.deepEqual(restored.config, config);
  assert.deepEqual(restored.environment.viewport, { width: 390, height: 844, devicePixelRatio: 3 });
  assert.equal(restored.observation.runState, 'paused');
  assert.equal(restored.observation.elapsedSeconds, stats.elapsedSeconds);
  assert.equal(restored.observation.physicsSteps, Math.round(stats.elapsedSeconds / FIXED_STEP_SECONDS));
  assert.equal(restored.observation.rendererFps, 59);
  assert.deepEqual(restored.observation.stats, stats);
});
