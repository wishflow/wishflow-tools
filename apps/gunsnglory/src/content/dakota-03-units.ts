import type { ScenarioUnit } from '../game';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
} from './mississippi-unit-unlocks';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './dakota-03.json';

/** Builds Fort Knockout's fresh-game TDM units using the shared campaign unlock gates. */
export function createDakota03MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return createNewMexicoMapUnits(
    map.originalTileGrid,
    (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks),
  );
}
