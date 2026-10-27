import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMapViewport, mapCellToScreen, screenToMapCell } from '../src/render/map-viewport';

test('fits the complete 17 by 17 Cow Gulch map inside the landscape viewport', () => {
  const viewport = calculateMapViewport(17, 17, 1024, 576);

  assert.equal(viewport.scale, 33 / 32);
  assert.equal(viewport.tileSize, 33);
  assert.equal(viewport.mapWidth, 561);
  assert.equal(viewport.mapHeight, 561);
  assert.equal(viewport.origin.x, 231.5);
  assert.equal(viewport.origin.y, 7.5);
  assert.ok(viewport.origin.x >= 0);
  assert.ok(viewport.origin.y >= 0);
  assert.ok(viewport.origin.x + viewport.mapWidth <= 1024);
  assert.ok(viewport.origin.y + viewport.mapHeight <= 576);
});

test('respects the zoom ceiling while fitting maps of different sizes', () => {
  const narrowMap = calculateMapViewport(8, 4, 1024, 576);
  const wideMap = calculateMapViewport(40, 17, 1024, 576);

  assert.equal(narrowMap.scale, 2);
  assert.equal(narrowMap.tileSize, 64);
  assert.equal(wideMap.scale, 25 / 32);
  assert.equal(wideMap.tileSize, 25);
  assert.ok(wideMap.origin.x + wideMap.mapWidth <= 1024);
  assert.ok(wideMap.origin.y + wideMap.mapHeight <= 576);
});

test('uses integer device pixels for each map cell at fractional display scales', () => {
  for (const displayPixelScale of [0.668, 0.998, 1, 1.3, 1.5, 1.976, 2]) {
    const viewport = calculateMapViewport(17, 17, 1024, 576, 32, displayPixelScale);
    const tilePixels = viewport.tileSize * displayPixelScale;
    assert.ok(Math.abs(tilePixels - Math.round(tilePixels)) < 1e-9);
    assert.ok(viewport.origin.x >= 0);
    assert.ok(viewport.origin.y >= 0);
    assert.ok(viewport.origin.x + viewport.mapWidth <= 1024);
    assert.ok(viewport.origin.y + viewport.mapHeight <= 576);
  }
});

test('uses the same map transform for drawing and pointer hit testing', () => {
  const viewport = calculateMapViewport(17, 17, 1024, 576);
  const center = mapCellToScreen(viewport, 5.5, 10.5);

  assert.deepEqual(screenToMapCell(viewport, center.x, center.y), { x: 5.5, y: 10.5 });
});
