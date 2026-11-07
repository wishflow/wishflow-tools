export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

function assertDimensions(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('Viewport dimensions must be finite and positive');
  }
}

export function fitAspectViewport(
  containerWidth: number,
  containerHeight: number,
  logicalWidth: number,
  logicalHeight: number,
): ViewportRect {
  assertDimensions(containerWidth, containerHeight);
  assertDimensions(logicalWidth, logicalHeight);
  const scale = Math.min(containerWidth / logicalWidth, containerHeight / logicalHeight);
  const width = logicalWidth * scale;
  const height = logicalHeight * scale;
  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
    scale,
  };
}

export function toLogicalPoint(
  x: number,
  y: number,
  viewport: ViewportRect,
  logicalWidth: number,
  logicalHeight: number,
): { x: number; y: number } | null {
  if (x < viewport.x || y < viewport.y
    || x >= viewport.x + viewport.width || y >= viewport.y + viewport.height) {
    return null;
  }
  return {
    x: (x - viewport.x) * logicalWidth / viewport.width,
    y: (y - viewport.y) * logicalHeight / viewport.height,
  };
}
