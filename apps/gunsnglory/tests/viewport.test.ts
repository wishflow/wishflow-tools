import assert from 'node:assert/strict';
import test from 'node:test';
import { fitAspectViewport, toLogicalPoint } from '../src/render/viewport';

test('fits a fixed landscape playfield and letterboxes portrait containers', () => {
  assert.deepEqual(fitAspectViewport(1280, 720, 1024, 576), {
    x: 0,
    y: 0,
    width: 1280,
    height: 720,
    scale: 1.25,
  });

  const portrait = fitAspectViewport(390, 844, 1024, 576);
  assert.equal(portrait.width, 390);
  assert.equal(portrait.height, 219.375);
  assert.equal(portrait.x, 0);
  assert.equal(portrait.y, (844 - portrait.height) / 2);
});

test('converts pointer coordinates through a resized, letterboxed canvas', () => {
  const rect = fitAspectViewport(390, 844, 1024, 576);
  const world = toLogicalPoint(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5, rect, 1024, 576);
  assert.deepEqual(world, { x: 512, y: 288 });
  assert.equal(toLogicalPoint(12, 20, rect, 1024, 576), null);
});
