import type { ScenarioUnit } from '../game';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './dakota-03.json';

/** Builds Fort Knockout's fresh-game TDM units using the shared campaign unlock gates. */
export function createDakota03MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createDakota03MapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota03MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  return createNewMexicoMapUnits(
    map.originalTileGrid,
    (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks),
  );
}
