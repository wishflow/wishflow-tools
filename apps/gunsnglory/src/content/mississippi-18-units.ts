import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';
import map from './mississippi-18.json';

// Markers 96–101 restore saved units when loading a save; they are not fresh-game hires.
const freshGameUnitGrid = map.originalTileGrid.map((row) => row.map((code) => (
  code >= 96 && code <= 101 ? 0 : code
)));

/** Creates Shadow Town's fresh-game units using the saved global unlock state. */
export function createMississippi18MapUnits(completedScenarioIds: readonly string[] = []) {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return createNewMexicoMapUnits(freshGameUnitGrid, (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks));
}
