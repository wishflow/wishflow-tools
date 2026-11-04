import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateMapViewport,
  cameraForAnchor,
  createMapCamera,
  getMapCameraOriginBounds,
  mapCellToScreen,
  panCameraByScreenDelta,
  mapViewportWithCamera,
  screenToMapCell,
} from '../src/render/map-viewport';

test('scales Cow Gulch from the viewport width and lets the camera crop its height', () => {
  const viewport = calculateMapViewport(17, 17, 1024, 576);

  assert.equal(viewport.scale, 60 / 32);
  assert.equal(viewport.tileSize, 60);
  assert.equal(viewport.mapWidth, 1020);
  assert.equal(viewport.mapHeight, 1020);
  assert.equal(viewport.origin.x, 2);
  assert.equal(viewport.origin.y, -222);
  assert.ok(viewport.origin.x >= 0);
  assert.ok(viewport.origin.x + viewport.mapWidth <= 1024);
  assert.ok(viewport.origin.y < 0);
  assert.ok(viewport.origin.y + viewport.mapHeight > 576);
});

test('respects the original minimum and maximum scale bounds while sizing maps by width', () => {
  const narrowMap = calculateMapViewport(8, 4, 1024, 576);
  const wideMap = calculateMapViewport(40, 17, 1024, 576);

  assert.equal(narrowMap.scale, 2);
  assert.equal(narrowMap.tileSize, 64);
  assert.equal(wideMap.scale, 27 / 32);
  assert.equal(wideMap.tileSize, 27);
  assert.ok(wideMap.origin.x < 0);
  assert.ok(wideMap.origin.x + wideMap.mapWidth > 1024);
  assert.ok(wideMap.origin.y + wideMap.mapHeight <= 576);
});

test('rounds the original scale to hundredths before truncating the displayed tile size', () => {
  const viewport = calculateMapViewport(29, 4, 320, 480);

  assert.equal(viewport.tileSize, 10);
  assert.equal(viewport.scale, 10 / 32);
  assert.equal(viewport.mapWidth, 290);
});

test('uses integer device pixels for each map cell at fractional display scales', () => {
  for (const displayPixelScale of [0.668, 0.998, 1, 1.3, 1.5, 1.976, 2]) {
    const viewport = calculateMapViewport(17, 17, 1024, 576, 32, displayPixelScale);
    const tilePixels = viewport.tileSize * displayPixelScale;
    assert.ok(Math.abs(tilePixels - Math.round(tilePixels)) < 1e-9);
    assert.ok(viewport.origin.x >= 0);
    assert.ok(viewport.origin.x + viewport.mapWidth <= 1024);
    assert.ok(viewport.origin.y < 0);
    assert.ok(viewport.origin.y + viewport.mapHeight > 576);
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

test('Cow Gulch camera exposes the APK two-tile frame for horizontal and vertical navigation', () => {
  const base = calculateMapViewport(17, 17, 1024, 576);
  const initial = createMapCamera();
  const shortHorizontalPan = panCameraByScreenDelta(base, 17, 17, 1024, 576, initial, 40, 0);
  const shortHorizontalViewport = mapViewportWithCamera(base, 17, 17, 1024, 576, shortHorizontalPan);
  assert.equal(shortHorizontalViewport.origin.x, 42, 'a horizontal drag must move the map instead of clamping to four pixels');

  const leftEdge = mapViewportWithCamera(
    base, 17, 17, 1024, 576, panCameraByScreenDelta(base, 17, 17, 1024, 576, initial, -1000, 0),
  );
  const rightEdge = mapViewportWithCamera(
    base, 17, 17, 1024, 576, panCameraByScreenDelta(base, 17, 17, 1024, 576, initial, 1000, 0),
  );
  const topEdge = mapViewportWithCamera(
    base, 17, 17, 1024, 576, panCameraByScreenDelta(base, 17, 17, 1024, 576, initial, 0, 1000),
  );
  const bottomEdge = mapViewportWithCamera(
    base, 17, 17, 1024, 576, panCameraByScreenDelta(base, 17, 17, 1024, 576, initial, 0, -1000),
  );

  assert.equal(leftEdge.origin.x, -116);
  assert.equal(rightEdge.origin.x, 120);
  assert.equal(topEdge.origin.y, 120);
  assert.equal(bottomEdge.origin.y, -564);
});

test('camera bounds keep maps smaller than the viewport centered without inverted limits', () => {
  assert.deepEqual(getMapCameraOriginBounds(512, 1024, 64), { minimum: 256, maximum: 256 });
});

test('pans the map at the fitted zoom and clamps both camera edges to the original two-tile frame', () => {
  const base = calculateMapViewport(17, 17, 1024, 576);
  const initial = createMapCamera();
  const movedDown = panCameraByScreenDelta(base, 17, 17, 1024, 576, initial, 0, 120);
  const movedDownViewport = mapViewportWithCamera(base, 17, 17, 1024, 576, movedDown);
  assert.equal(movedDown.zoom, 1);
  assert.equal(movedDownViewport.origin.y, -102);

  const movedToTop = panCameraByScreenDelta(base, 17, 17, 1024, 576, movedDown, 0, 500);
  const topViewport = mapViewportWithCamera(base, 17, 17, 1024, 576, movedToTop);
  assert.equal(topViewport.origin.y, 120, 'the camera may expose the original two-tile top frame');

  const movedToBottom = panCameraByScreenDelta(base, 17, 17, 1024, 576, initial, 0, -500);
  const bottomViewport = mapViewportWithCamera(base, 17, 17, 1024, 576, movedToBottom);
  assert.equal(bottomViewport.origin.y, -564, 'the camera may expose the original two-tile bottom frame');
});
