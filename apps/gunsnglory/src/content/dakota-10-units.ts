import type { ScenarioUnit } from '../game';
import { createMississippiSteamerPart } from './mississippi-steamer-parts';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import {
  mississippiUnitUnlocked,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './dakota-10.json';

function createSteamerGroup(start: { x: number; y: number }): ScenarioUnit[] {
  const row = map.originalTileGrid[start.y];
  if (!row) throw new Error(`Sioux Falls Steamer row is missing at ${start.y}`);
  const movementGroupId = `dakota-10-steamer-${start.x}-${start.y}`;
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

  if (!foundTail) throw new Error(`Sioux Falls Steamer at ${start.x},${start.y} has no tail marker`);
  return parts;
}

/** Creates the single original Sioux Falls Steamer and preserves both sleeping Cannon markers. */
export function createDakota10SteamerUnits(): ScenarioUnit[] {
  const starts = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 120 ? [{ x, y }] : []
  )));
  if (starts.length !== 1) throw new Error(`Sioux Falls must contain one Steamer start; found ${starts.length}`);
  return createSteamerGroup(starts[0]!);
}

/** Builds fresh-game map units from the original TDM and recorded unit unlock state. */
export function createDakota10MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks);
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  return [...mapUnits, ...createDakota10SteamerUnits()]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
