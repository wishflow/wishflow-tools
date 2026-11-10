import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createVerticalTrainPlacements,
  type CampaignMapUnitTypeId,
} from './campaign-map-unit-placements';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './new-mexico-07.json';

export function createLuckyLakeTrainUnits(): ScenarioUnit[] {
  return createCampaignTrainUnits(
    createVerticalTrainPlacements(map.originalTileGrid),
    'lucky-lake-train',
  );
}

/** Includes unlocked TDM units and the fixed seven-piece vertical train. */
export function createLuckyLakeUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): ScenarioUnit[] {
  return [
    ...createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked),
    ...createLuckyLakeTrainUnits(),
  ].sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
