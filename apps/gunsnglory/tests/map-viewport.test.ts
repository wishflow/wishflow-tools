import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateMapViewport,
  cameraForAnchor,
  createMapCamera,
  mapCellToScreen,
  mapViewportWithCamera,
  screenToMapCell,
} from '../src/render/map-viewport';

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


test('zooms around the two-finger focal point and uses the same transformed hit coordinates', () => {
  const base = calculateMapViewport(17, 17, 1024, 576);
  const anchor = { x: 8.5, y: 8.5 };
  const screenAnchor = mapCellToScreen(base, anchor.x, anchor.y);
  const camera = cameraForAnchor(base, 17, 17, 1024, 576, 2, anchor, screenAnchor);
  const viewport = mapViewportWithCamera(base, 17, 17, 1024, 576, camera);

  assert.equal(camera.zoom, 2);
  assert.deepEqual(mapCellToScreen(viewport, anchor.x, anchor.y), screenAnchor);
  assert.deepEqual(screenToMapCell(viewport, screenAnchor.x, screenAnchor.y), anchor);
  assert.ok(viewport.mapWidth > 1024);
  assert.ok(viewport.mapHeight > 576);
});

test('pinch midpoint movement pans the map while zoom limits keep the camera recoverable', () => {
  const base = calculateMapViewport(17, 17, 1024, 576);
  const anchor = { x: 8.5, y: 8.5 };
  const screenAnchor = mapCellToScreen(base, anchor.x, anchor.y);
  const panned = cameraForAnchor(base, 17, 17, 1024, 576, 2, anchor, { x: screenAnchor.x + 25, y: screenAnchor.y - 15 });
  const pannedViewport = mapViewportWithCamera(base, 17, 17, 1024, 576, panned);
  assert.deepEqual(mapCellToScreen(pannedViewport, anchor.x, anchor.y), { x: screenAnchor.x + 25, y: screenAnchor.y - 15 });

  const maxZoom = cameraForAnchor(base, 17, 17, 1024, 576, 99, anchor, screenAnchor);
  assert.equal(maxZoom.zoom, 3);
  const maxViewport = mapViewportWithCamera(base, 17, 17, 1024, 576, maxZoom);
  assert.ok(maxViewport.origin.x <= 0);
  assert.ok(maxViewport.origin.x + maxViewport.mapWidth >= 1024);
  assert.ok(maxViewport.origin.y <= 0);
  assert.ok(maxViewport.origin.y + maxViewport.mapHeight >= 576);

  const minZoom = cameraForAnchor(base, 17, 17, 1024, 576, 0.5, anchor, screenAnchor);
  assert.deepEqual(minZoom, createMapCamera());
  const initialViewport = mapViewportWithCamera(base, 17, 17, 1024, 576, createMapCamera());
  assert.deepEqual(mapViewportWithCamera(base, 17, 17, 1024, 576, minZoom), initialViewport);
});

test('camera scaling keeps integer device pixels and map edges inside the logical viewport', () => {
  for (const displayPixelScale of [1, 1.25, 1.5, 2]) {
    const base = calculateMapViewport(17, 17, 1024, 576, 32, displayPixelScale);
    const anchor = { x: 8.5, y: 8.5 };
    const screenAnchor = mapCellToScreen(base, anchor.x, anchor.y);
    const camera = cameraForAnchor(base, 17, 17, 1024, 576, 2.35, anchor, screenAnchor, displayPixelScale);
    const viewport = mapViewportWithCamera(base, 17, 17, 1024, 576, camera, displayPixelScale);
    assert.ok(Math.abs(viewport.tileSize * displayPixelScale - Math.round(viewport.tileSize * displayPixelScale)) < 1e-9);
    assert.ok(viewport.origin.x <= 0);
    assert.ok(viewport.origin.x + viewport.mapWidth >= 1024);
    assert.ok(viewport.origin.y <= 0);
    assert.ok(viewport.origin.y + viewport.mapHeight >= 576);
  }
});
