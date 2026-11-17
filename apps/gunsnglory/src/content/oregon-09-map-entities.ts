import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './oregon-09.json';
import { createOregon09MapScene } from './oregon-09-scene';
import { createOregon09SteamerUnits } from './oregon-09-steamer';

/** Builds Snake River's unlock-gated TDM hires and its separate moving Steamer group. */
export function createOregon09MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: ReturnType<typeof createOregon09MapScene> } {
  const units = [
    ...createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked),
    ...createOregon09SteamerUnits(),
  ].sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
  return { units, scene: createOregon09MapScene() };
}
