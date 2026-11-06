import assert from 'node:assert/strict';
import test from 'node:test';
import { JavaRandom } from '../src/game/java-random';

const bounds = [1, 2, 3, 7, 20, 100, 65_535, 0x4000_0000, 0x7fff_ffff] as const;

const javaReferenceVectors = [
  { seed: 0, values: [0, 0, 2, 3, 15, 85, 58_053, 1_017_661_202, 59_815_599] },
  { seed: 1, values: [0, 0, 1, 5, 11, 18, 18_569, 528_314_876, 1_841_320_954] },
  { seed: 42, values: [0, 1, 0, 6, 7, 12, 14_044, 974_592_113, 1_199_326_786] },
  { seed: 123_456_789, values: [0, 0, 0, 4, 8, 8, 44_771, 375_176_998, 433_381_353] },
  { seed: 0x7fff_ffff, values: [0, 0, 0, 6, 1, 49, 20_660, 78_940_290, 1_215_722_757] },
] as const;

test('matches independent Java Randomizer vectors across mixed bounds and seeds', () => {
  for (const vector of javaReferenceVectors) {
    const random = new JavaRandom(vector.seed);
    assert.equal(random.isFirstRandom(), true, `seed ${vector.seed} begins with firstRandom=true`);
    assert.deepEqual(bounds.map((bound) => random.nextInt(bound)), vector.values, `seed ${vector.seed}`);
    assert.equal(random.isFirstRandom(), false, `seed ${vector.seed} clears firstRandom after the first draw`);
  }
});

test('reset restores the explicit seed and first-random marker', () => {
  const random = new JavaRandom(42);
  const first = random.nextInt(100);
  assert.equal(random.isFirstRandom(), false);

  random.reset(42);
  assert.equal(random.isFirstRandom(), true);
  assert.equal(random.nextInt(100), first);
  assert.equal(random.isFirstRandom(), false);
});

test('rocket-angle adapter uses an independent deterministic Java double stream', () => {
  const gameRandom = new JavaRandom(42);
  const rocketAngleRandom = new JavaRandom(42);
  const expectedGameDraw = new JavaRandom(42).nextInt(100);

  assert.equal(rocketAngleRandom.nextDouble(), 0.7275636800328681);
  assert.equal(gameRandom.nextInt(100), expectedGameDraw,
    'consuming a rocket-angle value must not advance the APK Randomizer stream');
});

test('rejects bounds and seeds outside the Java/web session range', () => {
  const random = new JavaRandom(1);
  for (const bound of [0, -1, 1.5, 0x8000_0000]) {
    assert.throws(() => random.nextInt(bound), RangeError, `bound ${bound}`);
  }
  for (const seed of [-1, 1.5, 0x1_0000_0000]) {
    assert.throws(() => new JavaRandom(seed), RangeError, `seed ${seed}`);
  }
});
