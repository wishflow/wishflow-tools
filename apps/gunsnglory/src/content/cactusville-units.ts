import type { ScenarioUnit } from '../game';
import { createCampaignTrainUnits } from './campaign-train-units';
import {
  createVerticalTrainPlacements,
  type CampaignMapUnitTypeId,
} from './campaign-map-unit-placements';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import map from './new-mexico-08.json';

export function createCactusvilleTrainUnits(): ScenarioUnit[] {
  return createCampaignTrainUnits(
    createVerticalTrainPlacements(map.originalTileGrid),
    'cactusville-train',
  );
}

/** Includes all profile-eligible TDM units and the fixed five-piece vertical train. */
export function createCactusvilleUnits(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): ScenarioUnit[] {
  return [
    ...createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked),
    ...createCactusvilleTrainUnits(),
  ].sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
}
