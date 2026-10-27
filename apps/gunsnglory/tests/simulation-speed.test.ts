import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SIMULATION_SPEED,
  MAX_SIMULATION_SPEED,
  MIN_SIMULATION_SPEED,
  normalizeSimulationSpeed,
  SimulationTimeAccumulator,
} from '../src/game/time-scaling';

test('clamps and rounds simulation speed to quarter steps', () => {
  assert.equal(DEFAULT_SIMULATION_SPEED, 1);
  assert.equal(MIN_SIMULATION_SPEED, 0.25);
  assert.equal(MAX_SIMULATION_SPEED, 4);
  assert.equal(normalizeSimulationSpeed(0), 0.25);
  assert.equal(normalizeSimulationSpeed(1.625), 1.75);
  assert.equal(normalizeSimulationSpeed(5), 4);
  assert.throws(() => normalizeSimulationSpeed(Number.NaN), RangeError);
});

test('preserves fractional elapsed time at quarter speed', () => {
  const time = new SimulationTimeAccumulator();

  assert.deepEqual(time.advanceElapsed(17, 0.25), [4]);
  assert.deepEqual(time.advanceElapsed(17, 0.25), [4]);
  assert.deepEqual(time.advanceElapsed(17, 0.25), [4]);
  assert.deepEqual(time.advanceElapsed(17, 0.25), [5]);
});

test('splits accelerated elapsed time into original-sized steps and reset clears backlog', () => {
  const time = new SimulationTimeAccumulator();

  assert.deepEqual(time.advanceElapsed(250, 4), Array(10).fill(100));
  assert.deepEqual(time.advanceElapsed(3, 0.25), []);
  time.reset();
  assert.deepEqual(time.advanceElapsed(1, 0.25), []);
});
