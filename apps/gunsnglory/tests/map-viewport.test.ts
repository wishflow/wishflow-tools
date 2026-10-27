import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateMapViewport, mapCellToScreen, screenToMapCell } from '../src/render/map-viewport';

test('scales the 17 by 17 Cow Gulch map to the original logical screen width and centers it', () => {
  const viewport = calculateMapViewport(17, 17, 1024, 576);

  assert.equal(viewport.scale, 1.88);
  assert.equal(viewport.tileSize, 60);
  assert.equal(viewport.mapWidth, 1020);
  assert.equal(viewport.mapHeight, 1020);
  assert.equal(viewport.origin.x, 2);
  assert.equal(viewport.origin.y, -222);
});

test('keeps the source scale within the original lower and upper limits', () => {
  const narrowMap = calculateMapViewport(8, 4, 1024, 576);
  const wideMap = calculateMapViewport(40, 17, 1024, 576);

  assert.equal(narrowMap.scale, 2);
  assert.equal(narrowMap.tileSize, 64);
  assert.equal(wideMap.scale, 0.85);
  assert.equal(wideMap.tileSize, 27);
});

test('uses the same map transform for drawing and pointer hit testing', () => {
  const viewport = calculateMapViewport(17, 17, 1024, 576);
  const center = mapCellToScreen(viewport, 5.5, 10.5);

  assert.deepEqual(screenToMapCell(viewport, center.x, center.y), { x: 5.5, y: 10.5 });
});
