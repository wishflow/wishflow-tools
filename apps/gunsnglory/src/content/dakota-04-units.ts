import type { ScenarioUnit } from '../game';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './dakota-04.json';

/** Builds Badlands fresh-game hire units using the shared campaign unlock gates. */
export function createDakota04MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createDakota04MapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota04MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  return createNewMexicoMapUnits(
    map.originalTileGrid,
    (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks),
  );
}
