import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './dakota-05.json';

/** Builds Ghost Town's new-game activity-4 hires using the original global unlock gates. */
export function createDakota05MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createDakota05MapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota05MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks);
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}
