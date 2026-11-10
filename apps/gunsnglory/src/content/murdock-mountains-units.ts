import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './new-mexico-06.json';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';

/** Includes original map units that are eligible in the supplied profile snapshot. */
export function createMurdockMountainsUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
) {
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}
