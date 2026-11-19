import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import { createVerticalTrainPlacementGroups } from './campaign-map-unit-placements';
import map from './dakota-04.json';

/** Creates the APK's vertical two-wagon, two-locomotive train from Badlands TDM markers. */
export function createDakota04TrainUnits(): ScenarioUnit[] {
  return createVerticalTrainPlacementGroups(map.originalTileGrid).flatMap((placements, index) => (
    createCampaignTrainUnits(placements, `dakota-04-train-${index + 1}`)
  ));
}
