import type { ScenarioUnit } from '../game';
import { createMississippiSteamerPart } from './mississippi-steamer-parts';
import map from './mississippi-11.json';

const STEAMER_GROUP_ID = 'mississippi-11-steamer';

/** Creates the Steamer parts emitted by the map14 marker-120 scan. */
export function createMississippi11SteamerUnits(): ScenarioUnit[] {
  const markers = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 120 ? [{ x, y }] : []
  )));
  if (markers.length !== 1) return [];

  const start = markers[0]!;
  const row = map.originalTileGrid[start.y];
  if (!row) return [];
  const parts: ScenarioUnit[] = [];

  for (let x = start.x; x < row.length; x += 1) {
    const code = row[x];
    if (code === 120) {
      parts.push(createMississippiSteamerPart(
        `${STEAMER_GROUP_ID}-30`, STEAMER_GROUP_ID, 30, { x, y: start.y }, 5,
      ));
      parts.push(createMississippiSteamerPart(
        `${STEAMER_GROUP_ID}-31`, STEAMER_GROUP_ID, 31, { x: x + 1, y: start.y }, 5,
      ));
    } else if (code === 121) {
      parts.push(createMississippiSteamerPart(
        `${STEAMER_GROUP_ID}-32`, STEAMER_GROUP_ID, 32, { x, y: start.y }, 4,
      ));
    } else if (code === 122) {
      parts.push(createMississippiSteamerPart(
        `${STEAMER_GROUP_ID}-32`, STEAMER_GROUP_ID, 32, { x, y: start.y }, 5,
      ));
    } else if (code === 123) {
      parts.push(createMississippiSteamerPart(
        `${STEAMER_GROUP_ID}-33`, STEAMER_GROUP_ID, 33, { x, y: start.y }, 5,
      ));
      break;
    }
  }

  return parts.sort((left, right) => left.cell.x - right.cell.x);
}
