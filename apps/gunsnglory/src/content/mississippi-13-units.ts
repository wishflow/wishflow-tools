import type { ScenarioUnit } from '../game';
import map from './mississippi-13.json';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';

/** Creates all fresh-game units from map16's TDM markers and profile unlock snapshot. */
export function createMississippi13MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return createNewMexicoMapUnits(map.originalTileGrid, (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks));
}
