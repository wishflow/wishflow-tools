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

test('fits the complete fixed 16:9 game composition in fullscreen viewports', () => {
  const cases = [
    { width: 1024, height: 576 },
    { width: 844, height: 390 },
    { width: 667, height: 375 },
    { width: 390, height: 844 },
  ];

  for (const screen of cases) {
    const stage = fitAspectViewport(screen.width, screen.height, 1024, 576);
    assert.ok(Math.abs(stage.width / stage.height - (1024 / 576)) < 1e-12);
    assert.equal(stage.scale, Math.min(screen.width / 1024, screen.height / 576));
    assert.equal(stage.x, (screen.width - stage.width) / 2);
    assert.equal(stage.y, (screen.height - stage.height) / 2);
    assert.ok(stage.x >= 0 && stage.y >= 0);
    assert.ok(stage.x + stage.width <= screen.width);
    assert.ok(stage.y + stage.height <= screen.height);

    const logicalCenter = toLogicalPoint(
      stage.x + stage.width / 2,
      stage.y + stage.height / 2,
      stage,
      1024,
      576,
    );
    assert.deepEqual(logicalCenter, { x: 512, y: 288 });
  }
});
