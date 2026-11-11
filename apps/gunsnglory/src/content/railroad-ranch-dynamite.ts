import { createDynamiteScenarioDefinition } from './dynamite';
import type { DynamiteScenarioDefinition } from '../game';
import map from './new-mexico-09.json';

/** Reuses the original shared dynamite unlock and pairing behavior for this TDM. */
export function createRailroadRanchDynamiteDefinition(
  completedScenarioIds: readonly string[],
): DynamiteScenarioDefinition {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}
