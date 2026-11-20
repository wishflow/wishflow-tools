import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import { createHorizontalTrainPlacementGroups } from './campaign-map-unit-placements';
import map from './dakota-05.json';

/** Creates Ghost Town's two-engine, three-wagon horizontal train from its original TDM markers. */
export function createDakota05TrainUnits(): ScenarioUnit[] {
  return createHorizontalTrainPlacementGroups(map.originalTileGrid).flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `dakota-05-train-${index + 1}`)
  ));
}
