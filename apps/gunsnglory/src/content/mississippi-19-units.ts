import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import map from './mississippi-19.json';

/** Creates Dust Falls fresh-game units from the APK TDM and saved global unlock state. */
export function createMississippi19MapUnits(completedScenarioIds: readonly string[] = []) {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return createNewMexicoMapUnits(map.originalTileGrid, (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks));
}
