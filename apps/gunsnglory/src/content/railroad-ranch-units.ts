import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createHorizontalTrainPlacementGroups,
  createVerticalTrainPlacementGroups,
} from './campaign-map-unit-placements';
import map from './new-mexico-09.json';

/** Creates each of Railroad Ranch's six independent original train groups. */
export function createRailroadRanchTrainUnits(): ScenarioUnit[] {
  const horizontalGroups = createHorizontalTrainPlacementGroups(map.originalTileGrid);
  const verticalGroups = createVerticalTrainPlacementGroups(map.originalTileGrid);
  const units = [
    ...horizontalGroups.flatMap((placements, index) => (
      createCampaignTrainUnits(placements, `railroad-ranch-horizontal-train-${index + 1}`)
    )),
    ...verticalGroups.flatMap((placements, index) => (
      createCampaignTrainUnits(placements, `railroad-ranch-vertical-train-${index + 1}`)
    )),
  ];

  return units.sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
