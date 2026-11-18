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
import map from './dakota-02.json';

/** Builds Six Grandfathers' new-game TDM units and its one original horizontal train. */
export function createDakota02MapUnits(completedScenarioIds: readonly string[] = []): ScenarioUnit[] {
  return createDakota02MapUnitsFromSnapshot(mississippiUnitUnlockSnapshotFor(completedScenarioIds));
}

export function createDakota02MapUnitsFromSnapshot(unlocks: MississippiUnitUnlockSnapshot): ScenarioUnit[] {
  const isUnitUnlocked = (unitTypeId: CampaignMapUnitTypeId) => mississippiUnitUnlocked(unitTypeId, unlocks);
  const mapUnits = createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
  const trainUnits = createHorizontalTrainPlacementGroups(map.originalTileGrid)
    .flatMap((placements, index) => createCampaignTrainUnits(placements, `dakota-02-train-${index + 1}`));

  return [...mapUnits, ...trainUnits]
    .sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
