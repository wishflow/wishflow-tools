import { createCampaignTrainUnits } from './campaign-train-units';
import { createHorizontalTrainPlacements } from './campaign-map-unit-placements';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './new-mexico-05.json';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import type { ScenarioUnit } from '../game';

export function createBillyHillsTrainUnits(): ScenarioUnit[] {
  return createCampaignTrainUnits(createHorizontalTrainPlacements(map.originalTileGrid), 'billy-hills-train');
}

/** Includes only TDM units unlocked by the current formal/free-play profile snapshot. */
export function createBillyHillsUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): ScenarioUnit[] {
  return [
    ...createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked),
    ...createBillyHillsTrainUnits(),
  ];
}
