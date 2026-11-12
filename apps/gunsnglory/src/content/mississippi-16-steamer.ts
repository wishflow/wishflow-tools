import type { ScenarioUnit } from '../game';
import { createMississippiSteamerPart } from './mississippi-steamer-parts';
import map from './mississippi-16.json';

function createSteamerGroup(start: { x: number; y: number }): ScenarioUnit[] {
  const row = map.originalTileGrid[start.y];
  if (!row) throw new Error(`Highpoint Terrace Steamer row is missing at ${start.y}`);
  const movementGroupId = `mississippi-16-steamer-${start.x}-${start.y}`;
  const parts: ScenarioUnit[] = [];
  let foundTail = false;

  for (let x = start.x; x < row.length; x += 1) {
    const code = row[x];
    if (code === 120) {
      parts.push(createMississippiSteamerPart(
        `${movementGroupId}-30-${x}`, movementGroupId, 30, { x, y: start.y }, 5,
      ));
      parts.push(createMississippiSteamerPart(
        `${movementGroupId}-31-${x + 1}`, movementGroupId, 31, { x: x + 1, y: start.y }, 5,
      ));
    } else if (code === 121) {
      parts.push(createMississippiSteamerPart(
        `${movementGroupId}-32-${x}`, movementGroupId, 32, { x, y: start.y }, 4,
      ));
    } else if (code === 122) {
      parts.push(createMississippiSteamerPart(
        `${movementGroupId}-32-${x}`, movementGroupId, 32, { x, y: start.y }, 5,
      ));
    } else if (code === 123) {
      parts.push(createMississippiSteamerPart(
        `${movementGroupId}-33-${x}`, movementGroupId, 33, { x, y: start.y }, 5,
      ));
      foundTail = true;
      break;
    }
  }

  if (!foundTail) throw new Error(`Highpoint Terrace Steamer at ${start.x},${start.y} has no tail marker`);
  return parts;
}

/** Creates map19's single Steamer and preserves its code-121 cannon sleep state. */
export function createMississippi16SteamerUnits(): ScenarioUnit[] {
  const starts = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 120 ? [{ x, y }] : []
  )));
  if (starts.length !== 1) throw new Error(`Highpoint Terrace must contain one Steamer start; found ${starts.length}`);
  return createSteamerGroup(starts[0]!);
}
