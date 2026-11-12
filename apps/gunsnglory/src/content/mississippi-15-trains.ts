import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createHorizontalTrainPlacementGroups,
  createVerticalTrainPlacementGroups,
} from './campaign-map-unit-placements';
import map from './mississippi-15.json';

/** Creates each of Railroad Canyon's three independent original rail-train groups. */
export function createMississippi15TrainUnits(): ScenarioUnit[] {
  const horizontalGroups = createHorizontalTrainPlacementGroups(map.originalTileGrid);
  const verticalGroups = createVerticalTrainPlacementGroups(map.originalTileGrid);
  const units = [
    ...horizontalGroups.flatMap((placements, index) => (
      createCampaignTrainUnits(placements, `mississippi-15-horizontal-train-${index + 1}`)
    )),
    ...verticalGroups.flatMap((placements, index) => (
      createCampaignTrainUnits(placements, `mississippi-15-vertical-train-${index + 1}`)
    )),
  ];

  return units.sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
