import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBoundarySegments, getGapArcs, getPerimeter, isInsideArena, pointAtBoundaryDistance } from '../src/arena';
import { createRandom } from '../src/random';
import { DEFAULT_CONFIG } from '../src/types';

test('缺口沿周长等距分布，第一处在顶部中心', () => {
  const config = { ...DEFAULT_CONFIG, gapCount: 4 };
  const gaps = getGapArcs(config);
  const spacing = getPerimeter(config.shape) / gaps.length;

  assert.equal(gaps.length, 4);
  assert.equal(gaps[0].center, 0);
  assert.deepEqual(gaps.map((gap) => gap.center), [0, spacing, spacing * 2, spacing * 3]);
  const top = pointAtBoundaryDistance('circle', 0);
  assert.ok(Math.abs(top.x) < 1e-12);
  assert.equal(top.y, -10);
});

test('缺口宽度按球径比例计算且没有缺口时不产生缺口', () => {
  const config = { ...DEFAULT_CONFIG, gapCount: 3, gapWidthRatio: 2 };
  assert.equal(getGapArcs(config)[0].width, 10 * 2 * config.ballDiameterRatio * 2);
  assert.deepEqual(getGapArcs({ ...config, gapCount: 0 }), []);
});

test('圆形边界由连续圆弧逼近，球心范围按半径收缩', () => {
  const config = { ...DEFAULT_CONFIG, gapCount: 2 };
  const segments = buildBoundarySegments(config);
  assert.ok(segments.length > 100);
  for (const segment of segments) {
    assert.ok(Math.abs(Math.hypot(segment.from.x, segment.from.y) - 10) < 1e-9);
    assert.ok(Math.abs(Math.hypot(segment.to.x, segment.to.y) - 10) < 1e-9);
  }
  assert.equal(isInsideArena('circle', { x: 0, y: 9.7 }, 0.24), true);
  assert.equal(isInsideArena('circle', { x: 0, y: 9.8 }, 0.24), false);
});

test('同一随机种子生成相同随机序列', () => {
  const first = createRandom('LAB-0426');
  const repeated = createRandom('LAB-0426');
  const other = createRandom('LAB-0427');
  const sequence = Array.from({ length: 12 }, () => first());

  assert.deepEqual(sequence, Array.from({ length: 12 }, () => repeated()));
  assert.notDeepEqual(sequence, Array.from({ length: 12 }, () => other()));
});
