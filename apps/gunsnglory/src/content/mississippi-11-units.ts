import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './mississippi-11.json';

/** Creates map14's fresh-game units from its TDM markers and profile unlock snapshot. */
export function createMississippi11MapUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean = (unitTypeId) => unitTypeId <= 4,
): ScenarioUnit[] {
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}
