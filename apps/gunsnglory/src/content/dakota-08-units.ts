import type { ScenarioUnit } from '../game';
import { createMississippiSteamerPart } from './mississippi-steamer-parts';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './dakota-08.json';

function createSteamerGroup(start: { x: number; y: number }): ScenarioUnit[] {
  const row = map.originalTileGrid[start.y];
  if (!row) throw new Error(`Wayne Waters Steamer row is missing at ${start.y}`);
  const movementGroupId = `dakota-08-steamer-${start.x}-${start.y}`;
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

  if (!foundTail) throw new Error(`Wayne Waters Steamer at ${start.x},${start.y} has no tail marker`);
  return parts;
}

/** Creates the map's original TDM Steamer group with its two sleeping Cannon segments. */
export function createDakota08SteamerUnits(): ScenarioUnit[] {
  const starts = map.originalTileGrid.flatMap((row, y) => row.flatMap((code, x) => (
    code === 120 ? [{ x, y }] : []
  )));
  if (starts.length !== 1) throw new Error(`Wayne Waters must contain one Steamer start; found ${starts.length}`);
  return createSteamerGroup(starts[0]!);
}

/** Builds Wayne Waters' TDM units and Steamer from the recorded global unlock state. */
export function createDakota08MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks);
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const steamerUnits = createDakota08SteamerUnits();
  return [...mapUnits, ...steamerUnits]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}

export function createDakota08MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createDakota08MapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}
