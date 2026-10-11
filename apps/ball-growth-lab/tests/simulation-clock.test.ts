import assert from 'node:assert/strict';
import test from 'node:test';
import { SimulationClock } from '../src/physics/SimulationClock';
import { FIXED_STEP_SECONDS } from '../src/types';

const TICK_MILLISECONDS = 4;
const MAX_STEPS_PER_TICK = 6;

function stepsOverOneSecond(speed: 1 | 2 | 4 | 6): number {
  const clock = new SimulationClock(FIXED_STEP_SECONDS);
  clock.reset(0, true);
  let steps = 0;

  for (let tick = 1; tick <= 250; tick += 1) {
    steps += clock.advance(tick * TICK_MILLISECONDS, speed, MAX_STEPS_PER_TICK);
  }

  return steps;
}

for (const speed of [1, 2, 4, 6] as const) {
  test(`${speed}× 在一秒墙钟时间内推进 ${speed} 秒模拟时间`, () => {
    assert.equal(stepsOverOneSecond(speed), 240 * speed);
  });
}

test('运行中切换倍率按切换前后的墙钟区间分别累计', () => {
  const clock = new SimulationClock(FIXED_STEP_SECONDS);
  clock.reset(0, true);
  let steps = 0;

  for (let tick = 1; tick <= 125; tick += 1) {
    steps += clock.advance(tick * TICK_MILLISECONDS, 1, MAX_STEPS_PER_TICK);
  }
  for (let tick = 126; tick <= 250; tick += 1) {
    steps += clock.advance(tick * TICK_MILLISECONDS, 4, MAX_STEPS_PER_TICK);
  }

  assert.equal(steps, 600);
});

test('暂停期间的墙钟时间不会在恢复后被追赶', () => {
  const clock = new SimulationClock(FIXED_STEP_SECONDS);
  clock.reset(0, true);
  let steps = 0;

  for (let tick = 1; tick <= 125; tick += 1) {
    steps += clock.advance(tick * TICK_MILLISECONDS, 2, MAX_STEPS_PER_TICK);
  }
  clock.reset(10_000);
  steps += clock.advance(10_004, 2, MAX_STEPS_PER_TICK);

  assert.equal(steps, 241);
});
