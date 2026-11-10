import map from './new-mexico-04.json';
import { createHorizontalTrainPlacements, type CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import { createCampaignTrainUnits } from './campaign-train-units';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import type { ScenarioUnit } from '../game';

/** Builds map04 fresh-game units while preserving its existing map-facing helper. */
export function createTechTownBaseUnits(isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean): ScenarioUnit[] {
  return createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked);
}

/** Builds the original five-piece Tech Town train as a shared movement group. */
export function createTechTownTrainUnits(): ScenarioUnit[] {
  return createCampaignTrainUnits(createHorizontalTrainPlacements(map.originalTileGrid), 'tech-town-train');
}
