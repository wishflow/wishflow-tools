import type { DynamiteScenarioDefinition } from '../game';
import { pairDynamiteObjects } from '../game/dynamite';
import { createDynamiteScenarioDefinition } from './dynamite';
import map from './dakota-04.json';

/** Pairs Badlands' raw102/raw110 objects and applies the shared milestone unlock. */
export function createDakota04DynamiteDefinition(
  completedScenarioIds: readonly string[],
): DynamiteScenarioDefinition {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}

/** Rebuilds the recorded dynamic state without consulting the importing profile. */
export function createDakota04DynamiteDefinitionFromSnapshot(
  dynamiteUnlocked: boolean,
): DynamiteScenarioDefinition {
  return pairDynamiteObjects(map.originalTileGrid, dynamiteUnlocked);
}
