import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import map from './mississippi-18.json';

/** Creates Shadow Town's fresh-game units from the APK TDM and saved global unlock state. */
export function createMississippi18MapUnits(completedScenarioIds: readonly string[] = []) {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return createNewMexicoMapUnits(map.originalTileGrid, (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks));
}
