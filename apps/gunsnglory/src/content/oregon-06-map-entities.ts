import type { ScenarioUnit } from '../game';
import { createNewMexicoMapUnits } from './new-mexico-unit-entities';
import type { CampaignMapUnitTypeId } from './campaign-map-unit-placements';
import map from './oregon-06.json';
import { createOregon06MapScene } from './oregon-06-scene';
import { createOregon06SteamerUnits } from './oregon-06-steamer';

/** Builds Columbia River hires, active units, and Steamer from original TDM markers. */
export function createOregon06MapContent(
  isUnitUnlocked: (unitTypeId: CampaignMapUnitTypeId) => boolean,
): { units: ScenarioUnit[]; scene: ReturnType<typeof createOregon06MapScene> } {
  const units = [
    ...createNewMexicoMapUnits(map.originalTileGrid, isUnitUnlocked),
    ...createOregon06SteamerUnits(),
  ].sort((left, right) => left.cell.y - right.cell.y || left.cell.x - right.cell.x);
  return { units, scene: createOregon06MapScene() };
}
