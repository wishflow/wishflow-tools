import map from './mississippi-17.json';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';

/** Creates Dead Rocks units from map20 markers and the saved global unlock snapshot. */
export function createMississippi17MapUnits(completedScenarioIds: readonly string[] = []) {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return createNewMexicoMapUnits(map.originalTileGrid, (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks));
}
