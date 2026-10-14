export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 600;

export const LAWN = {
  x: 220,
  y: 130,
  width: 720,
  height: 380,
  rows: 5,
  columns: 9,
};

export const cellWidth = LAWN.width / LAWN.columns;
export const cellHeight = LAWN.height / LAWN.rows;

export function cellHeightFor(rows: number): number {
  return LAWN.height / Math.max(1, rows);
}

export function sunPosition(id: string): { x: number; y: number } {
  const numericId = Number.parseInt(id.slice(id.lastIndexOf('-') + 1), 36) || 1;
  return {
    x: LAWN.x + 54 + ((numericId * 137) % 620),
    y: LAWN.y + 25 + ((numericId * 47) % 310),
  };
}
