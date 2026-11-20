import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createHorizontalTrainPlacementGroups,
  type CampaignMapUnitTypeId,
} from './campaign-map-unit-placements';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import {
  mississippiUnitUnlocked,
  mississippiUnitUnlockSnapshotFor,
  type MississippiUnitUnlockSnapshot,
} from './mississippi-unit-unlocks';
import map from './dakota-07.json';

/** Builds Frost Station's new-game hires, unlocked units, and four original TDM trains. */
export function createDakota07MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createDakota07MapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota07MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks);
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const trainUnits = createHorizontalTrainPlacementGroups(map.originalTileGrid).flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `dakota-07-train-${index + 1}`)
  ));

  return [...mapUnits, ...trainUnits]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
