import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './dakota-06.json';

/** Builds Ice Rocks' new-game units using the original global unit unlock gates. */
export function createDakota06MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createDakota06MapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota06MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks);
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}
