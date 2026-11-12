import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './mississippi-12.json';

/** Creates map15's fresh-game units from its TDM markers and profile unlock snapshot. */
export function createMississippi12MapUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean = (unitTypeId) => unitTypeId <= 4,
): ScenarioUnit[] {
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}
