import type { ScenarioUnit } from '../game';
import map from './mississippi-16.json';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import { mississippiUnitUnlocked, mississippiUnitUnlockSnapshotFor } from './mississippi-unit-unlocks';

/** Creates all fresh-game units from map19's TDM markers and profile unlock snapshot. */
export function createMississippi16MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  const unlocks = mississippiUnitUnlockSnapshotFor(completedScenarioIds);
  return createNewMexicoMapUnits(map.originalTileGrid, (unitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks));
}
