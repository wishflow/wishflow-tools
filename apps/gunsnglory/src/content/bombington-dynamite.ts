import type { DynamiteScenarioDefinition } from '../game';
import { pairDynamiteObjects } from '../game/dynamite';
import { createDynamiteScenarioDefinition } from './dynamite';
import map from './nevada-02.json';

/** Builds Bombington's nine APK trigger/box pairs and uses the global unlock gate. */
export function createBombingtonDynamiteDefinition(
  completedScenarioIds: readonly string[],
): DynamiteScenarioDefinition {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}

/** Restores the recorded unlock state for a replay without consulting the current profile. */
export function createBombingtonDynamiteDefinitionFromSnapshot(
  unlocked: boolean,
): DynamiteScenarioDefinition {
  return pairDynamiteObjects(map.originalTileGrid, unlocked);
}
