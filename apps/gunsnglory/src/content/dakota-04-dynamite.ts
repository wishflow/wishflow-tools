import type { DynamiteScenarioDefinition } from '../game';
import { createDynamiteScenarioDefinition } from './dynamite';
import map from './dakota-04.json';

/** Pairs Badlands' raw102/raw110 objects and applies the shared milestone unlock. */
export function createDakota04DynamiteDefinition(
  completedScenarioIds: readonly string[],
): DynamiteScenarioDefinition {
  return createDynamiteScenarioDefinition(map.originalTileGrid, completedScenarioIds);
}
