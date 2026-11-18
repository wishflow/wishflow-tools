import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import { createVerticalTrainPlacementGroups } from './campaign-map-unit-placements';
import map from './dakota-03.json';

/** Creates the APK's vertical two-wagon, two-locomotive train from Fort Knockout TDM markers. */
export function createDakota03TrainUnits(): ScenarioUnit[] {
  return createVerticalTrainPlacementGroups(map.originalTileGrid).flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `dakota-03-train-${index + 1}`)
  ));
}
