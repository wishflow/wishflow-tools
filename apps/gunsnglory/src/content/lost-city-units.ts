import type { ScenarioUnit } from '../game';
import {
  createHorizontalTrainPlacementGroups,
  type CampaignMapUnitTypeId,
} from './campaign-map-unit-placements';
import { createCampaignTrainUnits } from './campaign-train-units';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './new-mexico-10.json';

/** Creates the two five-part horizontal trains with independent APK movement groups. */
export function createLostCityTrainUnits(): ScenarioUnit[] {
  const groups = createHorizontalTrainPlacementGroups(map.originalTileGrid);
  if (groups.length !== 2) {
    throw new Error(`Lost City TDM must contain two horizontal trains; found ${groups.length}`);
  }
  return groups.flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `lost-city-horizontal-train-${index + 1}`)
  ));
}

/** Creates TDM-placed units using the profile's original unit-unlock snapshot. */
export function createLostCityMapUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): ScenarioUnit[] {
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}
