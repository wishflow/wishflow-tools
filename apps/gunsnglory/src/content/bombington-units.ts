import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './nevada-02.json';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Builds new-game TDM hire objects from the recorded campaign unlock snapshot. */
export function createBombingtonMapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks);
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}

/** Convenience entry point for a current profile; replay builders must pass their recorded snapshot directly. */
export function createBombingtonMapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createBombingtonMapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}
